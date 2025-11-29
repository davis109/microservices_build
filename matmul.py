import numpy as np
import time
import sys
import os

# Define the number of threads for parallel mode (if using multiprocessing/explicit threading)
# Note: For simple NumPy, the parallelism is usually handled internally.

def now_sec():
    """Returns the current time in seconds (monotonic)."""
    return time.monotonic()

def init_mat(N, val):
    """Initializes an NxN matrix with patterned values."""
    # Use NumPy for fast, aligned array creation
    A = np.zeros((N, N), dtype=np.float64)
    # The C code's pattern: val * ((i&3)+1)
    # Since NumPy often vectorizes, this is the simple way to initialize
    for i in range(N * N):
        row = i // N
        col = i % N
        A[row, col] = val * ((i & 3) + 1)
    return A

def matmul_serial(N, A, B, C):
    """Standard serial (i-j-k) matrix multiplication using NumPy indexing."""
    # Note: Pure Python loops over NumPy arrays are still slow compared to C, 
    # but this mimics the C structure.
    for i in range(N):
        for j in range(N):
            sum_val = 0.0
            for k in range(N):
                sum_val += A[i, k] * B[k, j]
            C[i, j] = sum_val

def matmul_numpy_naive(N, A, B, C):
    """Uses the highly optimized NumPy dot product."""
    # This is the standard, fast way to do MM in Python.
    # It often uses highly optimized, multi-threaded C/Fortran libraries (BLAS/LAPACK).
    C[:] = A @ B  # Or C[:] = np.dot(A, B)

def matmul_blocked(N, A, B, C, BS):
    """Simplified blocked matrix multiplication (NumPy arrays)."""
    # This mimics the C structure but relies on NumPy for array handling.
    
    # Ensure C is zeroed out before accumulation
    C[:] = 0.0

    for ii in range(0, N, BS):
        for jj in range(0, N, BS):
            for kk in range(0, N, BS):
                # Slice the blocks (views into the original arrays)
                A_block = A[ii:ii+BS, kk:kk+BS]
                B_block = B[kk:kk+BS, jj:jj+BS]
                C_block = C[ii:ii+BS, jj:jj+BS]
                
                # Perform matrix multiplication on the blocks and accumulate
                # NumPy handles the underlying block multiplication efficiently
                C_block += A_block @ B_block

def main():
    if len(sys.argv) < 4:
        print(f"Usage: python {sys.argv[0]} N threads mode [BS]")
        print(" modes: s=serial, n=numpy_optimized, b=blocked")
        sys.exit(1)

    try:
        N = int(sys.argv[1])
        threads = int(sys.argv[2])
        mode = sys.argv[3][0].lower()
        BS = int(sys.argv[4]) if len(sys.argv) >= 5 else 64
    except ValueError:
        print("Error: N, threads, and BS must be valid integers.")
        sys.exit(1)

    # Set environment variable for NumPy/BLAS threads (influences 'n' mode)
    # Note: This is a general suggestion; actual thread control depends on the BLAS library.
    os.environ['OMP_NUM_THREADS'] = str(threads) 
    os.environ['OPENBLAS_NUM_THREADS'] = str(threads) 

    # 1. Initialize matrices A, B, and C
    A = init_mat(N, 1.0)
    B = init_mat(N, 2.0)
    C = np.zeros((N, N), dtype=np.float64)

    t0 = now_sec()
    
    # 2. Dispatch to the selected multiplication mode
    if mode == 's':
        matmul_serial(N, A, B, C)
    elif mode == 'n':
        matmul_numpy_naive(N, A, B, C)
    elif mode == 'b':
        matmul_blocked(N, A, B, C, BS)
    else:
        print(f"Error: Invalid mode '{mode}'. Use s, n, or b.")
        sys.exit(1)

    t1 = now_sec()

    # 3. Simple checksum and output
    sum_val = C.sum() 
    
    print(f"N={N} threads={threads} mode={mode} BS={BS} time={t1-t0:.6f} sum={sum_val:.6f}")

if __name__ == "__main__":
    main()