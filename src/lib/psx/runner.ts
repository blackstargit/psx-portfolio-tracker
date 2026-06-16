/** Shared Python subprocess runner for psxdata wrapper scripts. */
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Windows often has `py` or `python3` instead of `python`
const PYTHON_EXECUTABLES = ['python', 'python3', 'py']

function scriptPath(name: string): string {
  return join(__dirname, `${name}.py`)
}

export function runPython(scriptName: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    let proc: ReturnType<typeof spawn> | null = null
    let tried = 0

    function tryNext() {
      if (tried >= PYTHON_EXECUTABLES.length) {
        reject(new Error(stderr || 'No Python interpreter found. Install Python 3.11+ and ensure it is on PATH.'))
        return
      }

      const exe = PYTHON_EXECUTABLES[tried++]
      proc = spawn(exe, [scriptPath(scriptName), ...args], {
        timeout: 30_000,
        signal: AbortSignal.timeout(30_000),
      })

      stdout = ''
      stderr = ''

      proc.stdout?.on('data', (data) => { stdout += data.toString() })
      proc.stderr?.on('data', (data) => { stderr += data.toString() })

      proc.on('close', (code) => {
        if (code === 0 || stdout.trim()) {
          resolve(stdout.trim())
        } else if (tried < PYTHON_EXECUTABLES.length) {
          proc = null
          tryNext()
        } else {
          reject(new Error(stderr || `Python script exited with code ${code}`))
        }
      })

      proc.on('error', () => {
        if (tried < PYTHON_EXECUTABLES.length) {
          proc = null
          tryNext()
        } else {
          reject(new Error(stderr || 'No Python interpreter found. Install Python 3.11+ and ensure it is on PATH.'))
        }
      })
    }

    tryNext()
  })
}