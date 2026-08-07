# Dump the names of every taskbar button via UI Automation. Used by taskbar-probe.mjs: the
# taskbar reports "<App> - N running windows", which is the only reliable read of whether a
# window is registered, since skipTaskbar is shell registration and not a window style.
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes

$root = [System.Windows.Automation.AutomationElement]::RootElement
$cond = New-Object System.Windows.Automation.PropertyCondition(
  [System.Windows.Automation.AutomationElement]::ClassNameProperty, 'Shell_TrayWnd')
$tray = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $cond)
if ($null -eq $tray) { Write-Output 'NO_TRAY'; exit 1 }

$btnCond = New-Object System.Windows.Automation.PropertyCondition(
  [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
  [System.Windows.Automation.ControlType]::Button)

foreach ($b in $tray.FindAll([System.Windows.Automation.TreeScope]::Descendants, $btnCond)) {
  Write-Output $b.Current.Name
}
