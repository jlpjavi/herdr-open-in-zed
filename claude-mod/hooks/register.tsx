import type { Register } from 'claude-code'

// Runs the herdr-open-in-zed script: `zed -e <git root>` in the running Zed or Zed Preview.
const OPEN_SCRIPT = '/Users/javier.punzano/projects/herdr-open-in-zed/src/open.ts'

export const register: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Button } = $.ui.resolve(e)

    return (
      <Box>
        <Button
          key="zed"
          label="Open in Zed"
          hotkey="z"
          onPress={async () => {
            const cwd = await $.session.cwd()
            const { exitCode, stderr } = await $.process.run(['bun', OPEN_SCRIPT, '--cwd', cwd])
            $.ui.toast(exitCode === 0 ? 'Opened in Zed' : `Open in Zed failed: ${stderr.trim()}`)
          }}
        />
      </Box>
    )
  })
}
