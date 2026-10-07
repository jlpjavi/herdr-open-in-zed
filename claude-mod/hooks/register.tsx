import type { Register } from 'claude-code'

// Runs the herdr-open-in-zed script: `zed -e <git root>` in the running Zed or Zed Preview.
// Absolute paths: the engine's process environment may not carry the shell's PATH.
const BUN = '/opt/homebrew/bin/bun'
const OPEN_SCRIPT = '/Users/javier.punzano/projects/herdr-open-in-zed/src/open.ts'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'zed',
      description: 'Open this project in the running Zed or Zed Preview',
    })

    return next(e)
  })

  on('command.run', { command: 'zed' }, async $ => {
    try {
      const cwd = await $.session.cwd()
      const { exitCode, stdout, stderr } = await $.process.run([BUN, OPEN_SCRIPT, '--cwd', cwd])

      return {
        text: exitCode === 0 ? 'Opened in Zed.' : `Open in Zed failed (${exitCode}): ${(stderr || stdout).trim()}`,
      }
    } catch (error) {
      return { text: `Open in Zed error: ${String(error)}` }
    }
  })
}
