param([Parameter(Mandatory=$true)][string]$Recipient)

$required = @('WHATSAPP_GRAPH_API_VERSION','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_ACCESS_TOKEN','WHATSAPP_OTP_TEMPLATE','WHATSAPP_TEMPLATE_LANGUAGE')
foreach ($name in $required) {
  if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Missing environment variable: $name" }
}

$version = [Environment]::GetEnvironmentVariable('WHATSAPP_GRAPH_API_VERSION')
$phoneId = [Environment]::GetEnvironmentVariable('WHATSAPP_PHONE_NUMBER_ID')
$token = [Environment]::GetEnvironmentVariable('WHATSAPP_ACCESS_TOKEN')
$template = [Environment]::GetEnvironmentVariable('WHATSAPP_OTP_TEMPLATE')
$language = [Environment]::GetEnvironmentVariable('WHATSAPP_TEMPLATE_LANGUAGE')
$code = '000000'
$payload = @{
  messaging_product = 'whatsapp'; recipient_type = 'individual'; to = ($Recipient -replace '^\+',''); type = 'template'
  template = @{name = $template; language = @{code = $language}; components = @(
    @{type='body'; parameters=@(@{type='text'; text=$code})},
    @{type='button'; sub_type='url'; index='0'; parameters=@(@{type='text'; text=$code})}
  )}
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post -Uri "https://graph.facebook.com/$version/$phoneId/messages" -Headers @{Authorization="Bearer $token"} -ContentType 'application/json' -Body $payload
