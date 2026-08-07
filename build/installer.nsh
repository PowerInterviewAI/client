; Picked up automatically by electron-builder as `nsis.include` (defaults to build/installer.nsh).
;
; `createDesktopShortcut: false` only stops the installer from creating a NEW desktop shortcut.
; Everyone who installed an earlier build still has the old one, and that icon is exactly what a
; screen share exposes, so an upgrade has to remove it.
;
; $oldDesktopLink / $newDesktopLink are set by `setLinkVars` at the top of the install section
; (installSection.nsh), well before customInstall runs at the end of it. Both are checked because
; the shortcut name recorded in the registry may differ from the current ${SHORTCUT_NAME}.
!macro customInstall
  Delete "$oldDesktopLink"
  Delete "$newDesktopLink"
  ; Refresh the shell so the icon disappears without a sign-out.
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend
