const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const ejs = require('ejs');
const { v4: uuidv4 } = require('uuid');

class BuilderService {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.tempDir = path.join(__dirname, '../../temp');
    this.generatedDir = path.join(__dirname, '../../generated');
  }

  /**
   * Main method to generate a complete project
   */
  async generateProject({ projectName, services, connections, metadata }) {
    const projectId = uuidv4();
    const projectDir = path.join(this.tempDir, projectId);

    try {
      // Ensure directories exist
      await this.ensureDirectories();

      // Create project directory
      await fs.mkdir(projectDir, { recursive: true });

      // Generate docker-compose.yml
      await this.generateDockerCompose(projectDir, {
        projectName,
        services,
        connections,
        metadata
      });

      // Generate each service
      for (const service of services) {
        await this.generateService(projectDir, service, connections, services);
      }

      // Generate README
      await this.generateReadme(projectDir, { projectName, services, connections });

      // Create .env.example
      await this.generateEnvExample(projectDir, services);

      // Zip the project
      const zipPath = await this.zipProject(projectDir, projectName);

      // Return zip stream
      const zipStats = await fs.stat(zipPath);
      const stream = require('fs').createReadStream(zipPath);

      // Clean up temp directory after sending (with delay)
      setTimeout(() => this.cleanup(projectDir, zipPath), 5000);

      return {
        stream,
        size: zipStats.size,
        path: zipPath
      };

    } catch (error) {
      // Cleanup on error
      await this.cleanup(projectDir);
      throw error;
    }
  }

  /**
   * Generate docker-compose.yml
   */
  async generateDockerCompose(projectDir, { projectName, services, connections, metadata }) {
    const templatePath = path.join(this.templatesDir, 'docker-compose.yml.ejs');
    
    // Build service configurations
    const serviceConfigs = services.map(service => {
      const dependsOn = this.findDependencies(service.id, connections, services);
      return {
        ...service,
        dependsOn,
        sanitizedName: this.sanitizeName(service.label || service.type)
      };
    });

    const composeContent = await ejs.renderFile(templatePath, {
      projectName: this.sanitizeName(projectName),
      services: serviceConfigs,
      networkName: metadata.networkName || 'app-network',
      version: metadata.composeVersion || '3.8'
    });

    await fs.writeFile(
      path.join(projectDir, 'docker-compose.yml'),
      composeContent
    );
  }

  /**
   * Generate individual service
   */
  async generateService(projectDir, service, connections, allServices) {
    const serviceDir = path.join(projectDir, this.sanitizeName(service.label || service.type));
    await fs.mkdir(serviceDir, { recursive: true });

    const templateDir = path.join(this.templatesDir, service.type);
    
    // Copy template files
    await this.copyTemplateFiles(templateDir, serviceDir, service, connections, allServices);

    // Generate Dockerfile
    await this.generateDockerfile(serviceDir, service);

    // Generate service-specific config
    await this.generateServiceConfig(serviceDir, service, connections, allServices);
  }

  /**
   * Copy and process template files
   */
  async copyTemplateFiles(templateDir, targetDir, service, connections, allServices) {
    try {
      const files = await fs.readdir(templateDir, { withFileTypes: true });

      for (const file of files) {
        const sourcePath = path.join(templateDir, file.name);
        const targetPath = path.join(targetDir, file.name.replace('.ejs', ''));

        if (file.isDirectory()) {
          await fs.mkdir(targetPath, { recursive: true });
          await this.copyTemplateFiles(sourcePath, targetPath, service, connections, allServices);
        } else if (file.name.endsWith('.ejs')) {
          // Process EJS template
          const content = await ejs.renderFile(sourcePath, {
            service,
            connections,
            allServices,
            dependencies: this.findDependencies(service.id, connections, allServices)
          });
          await fs.writeFile(targetPath, content);
        } else {
          // Copy file as-is
          await fs.copyFile(sourcePath, targetPath);
        }
      }
    } catch (error) {
      console.log(`Note: No template directory found for ${service.type}, using minimal setup`);
    }
  }

  /**
   * Generate Dockerfile for a service
   */
  async generateDockerfile(serviceDir, service) {
    const templatePath = path.join(this.templatesDir, service.type, 'Dockerfile.ejs');
    
    try {
      const dockerfileContent = await ejs.renderFile(templatePath, { service });
      await fs.writeFile(path.join(serviceDir, 'Dockerfile'), dockerfileContent);
    } catch (error) {
      // Use default Dockerfile if template not found
      const defaultDockerfile = this.getDefaultDockerfile(service.type);
      await fs.writeFile(path.join(serviceDir, 'Dockerfile'), defaultDockerfile);
    }
  }

  /**
   * Generate service-specific configuration
   */
  async generateServiceConfig(serviceDir, service, connections, allServices) {
    const dependencies = this.findDependencies(service.id, connections, allServices);
    
    // Generate connection code based on service type
    switch (service.type) {
      case 'node':
        await this.generateNodeConfig(serviceDir, service, dependencies);
        break;
      case 'python-flask':
      case 'python-fastapi':
        await this.generatePythonConfig(serviceDir, service, dependencies);
        break;
      case 'react':
      case 'vue':
      case 'angular':
        await this.generateFrontendConfig(serviceDir, service, dependencies);
        break;
    }
  }

  /**
   * Generate Node.js service configuration
   */
  async generateNodeConfig(serviceDir, service, dependencies) {
    const dbDep = dependencies.find(d => ['mongodb', 'postgresql', 'mysql'].includes(d.type));
    const redisDep = dependencies.find(d => d.type === 'redis');

    let connectionCode = '';
    let requiredPackages = ['express', 'dotenv', 'cors'];

    if (dbDep) {
      if (dbDep.type === 'mongodb') {
        requiredPackages.push('mongoose');
        connectionCode += this.getMongooseConnectionCode(dbDep);
      } else if (dbDep.type === 'postgresql') {
        requiredPackages.push('pg');
        connectionCode += this.getPostgresConnectionCode(dbDep);
      } else if (dbDep.type === 'mysql') {
        requiredPackages.push('mysql2');
        connectionCode += this.getMySQLConnectionCode(dbDep);
      }
    }

    if (redisDep) {
      requiredPackages.push('redis');
      connectionCode += this.getRedisConnectionCode(redisDep);
    }

    // Update package.json if it exists
    const packageJsonPath = path.join(serviceDir, 'package.json');
    try {
      let packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      packageJson.dependencies = packageJson.dependencies || {};
      
      for (const pkg of requiredPackages) {
        if (!packageJson.dependencies[pkg]) {
          packageJson.dependencies[pkg] = 'latest';
        }
      }
      
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    } catch (error) {
      console.log('No package.json found for service');
    }
  }

  /**
   * Generate Python service configuration
   */
  async generatePythonConfig(serviceDir, service, dependencies) {
    const dbDep = dependencies.find(d => ['mongodb', 'postgresql', 'mysql'].includes(d.type));
    
    let requirements = [];
    
    if (service.type === 'python-flask') {
      requirements.push('Flask', 'python-dotenv', 'flask-cors');
    } else {
      requirements.push('fastapi', 'uvicorn', 'python-dotenv');
    }

    if (dbDep) {
      if (dbDep.type === 'mongodb') {
        requirements.push('pymongo');
      } else if (dbDep.type === 'postgresql') {
        requirements.push('psycopg2-binary');
      } else if (dbDep.type === 'mysql') {
        requirements.push('mysql-connector-python');
      }
    }

    await fs.writeFile(
      path.join(serviceDir, 'requirements.txt'),
      requirements.join('\n')
    );
  }

  /**
   * Generate frontend configuration
   */
  async generateFrontendConfig(serviceDir, service, dependencies) {
    const apiDep = dependencies.find(d => ['node', 'python-flask', 'python-fastapi'].includes(d.type));
    
    if (apiDep) {
      const envContent = `REACT_APP_API_URL=http://${this.sanitizeName(apiDep.label)}:${apiDep.config?.port || 5000}\n`;
      await fs.writeFile(path.join(serviceDir, '.env.example'), envContent);
    }
  }

  /**
   * Generate project README
   */
  async generateReadme(projectDir, { projectName, services, connections }) {
    const templatePath = path.join(this.templatesDir, 'README.md.ejs');
    
    const readmeContent = await ejs.renderFile(templatePath, {
      projectName,
      services,
      connections,
      generatedDate: new Date().toISOString()
    });

    await fs.writeFile(path.join(projectDir, 'README.md'), readmeContent);
  }

  /**
   * Generate .env.example
   */
  async generateEnvExample(projectDir, services) {
    let envContent = '# Environment Variables\n\n';
    
    services.forEach(service => {
      if (service.config?.environment) {
        envContent += `# ${service.label || service.type}\n`;
        for (const [key, value] of Object.entries(service.config.environment)) {
          envContent += `${key}=${value}\n`;
        }
        envContent += '\n';
      }
    });

    await fs.writeFile(path.join(projectDir, '.env.example'), envContent);
  }

  /**
   * Zip the project directory
   */
  async zipProject(projectDir, projectName) {
    const zipPath = path.join(this.generatedDir, `${this.sanitizeName(projectName)}_${Date.now()}.zip`);
    
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(zipPath));
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(projectDir, false);
      archive.finalize();
    });
  }

  /**
   * Find service dependencies based on connections
   */
  findDependencies(serviceId, connections, allServices) {
    if (!connections) return [];
    
    const dependencyIds = connections
      .filter(conn => conn.source === serviceId)
      .map(conn => conn.target);

    return allServices.filter(s => dependencyIds.includes(s.id));
  }

  /**
   * Sanitize names for file systems and Docker
   */
  sanitizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  }

  /**
   * Get default Dockerfile based on service type
   */
  getDefaultDockerfile(type) {
    const dockerfiles = {
      'node': `FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 5000\nCMD ["npm", "start"]`,
      'react': `FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]`,
      'python-flask': `FROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nEXPOSE 5000\nCMD ["python", "app.py"]`,
      'python-fastapi': `FROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`
    };
    
    return dockerfiles[type] || `FROM alpine:latest\nCMD ["echo", "Service ready"]`;
  }

  /**
   * Connection code generators
   */
  getMongooseConnectionCode(dbService) {
    return `
// MongoDB Connection
const mongoose = require('mongoose');
const mongoUri = process.env.MONGODB_URI || 'mongodb://${this.sanitizeName(dbService.label)}:27017/mydb';

mongoose.connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));
`;
  }

  getPostgresConnectionCode(dbService) {
    return `
// PostgreSQL Connection
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.POSTGRES_HOST || '${this.sanitizeName(dbService.label)}',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'mydb',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password'
});

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ PostgreSQL connection error:', err));
`;
  }

  getMySQLConnectionCode(dbService) {
    return `
// MySQL Connection
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '${this.sanitizeName(dbService.label)}',
  port: process.env.MYSQL_PORT || 3306,
  database: process.env.MYSQL_DATABASE || 'mydb',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password'
});

pool.getConnection()
  .then(() => console.log('✅ Connected to MySQL'))
  .catch(err => console.error('❌ MySQL connection error:', err));
`;
  }

  getRedisConnectionCode(redisService) {
    return `
// Redis Connection
const redis = require('redis');
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://${this.sanitizeName(redisService.label)}:6379'
});

redisClient.connect()
  .then(() => console.log('✅ Connected to Redis'))
  .catch(err => console.error('❌ Redis connection error:', err));
`;
  }

  /**
   * Ensure necessary directories exist
   */
  async ensureDirectories() {
    await fs.mkdir(this.tempDir, { recursive: true });
    await fs.mkdir(this.generatedDir, { recursive: true });
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(projectDir, zipPath) {
    try {
      if (projectDir) {
        await fs.rm(projectDir, { recursive: true, force: true });
      }
      // Keep zip files for now, can add cleanup later
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

module.exports = new BuilderService();
