chcp 65001 | Out-Null
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

$env:CLAUDE_CODE_USE_FOUNDRY = "1"
$env:ANTHROPIC_FOUNDRY_BASE_URL = ""
$env:ANTHROPIC_FOUNDRY_API_KEY = ""

$env:ANTHROPIC_DEFAULT_OPUS_MODEL = "deepseek-v4-pro[1m]"
$env:ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES = "thinking,adaptive_thinking,temperature,effort,max_effort"

$env:ANTHROPIC_DEFAULT_SONNET_MODEL = "deepseek-v4-pro[1m]"
$env:ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES = "thinking,adaptive_thinking,temperature,effort,max_effort"

$env:ANTHROPIC_DEFAULT_HAIKU_MODEL = "deepseek-v4-pro[1m]"
$env:ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES = "thinking,adaptive_thinking,temperature,effort,max_effort"

$env:CLAUDE_CODE_EFFORT_LEVEL = "max"

cd $PSScriptRoot

claude --dangerously-skip-permissions
