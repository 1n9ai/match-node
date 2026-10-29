; installer.iss — ตัวติดตั้ง 1n9 Match (Inno Setup 6) — แบบเดียวกับตัวติดตั้งของแชทบอท (node/packaging/windows)
; สร้างด้วย: ISCC.exe installer.iss /DAppVersion=1.0.0 /DSourceDir=<โฟลเดอร์ dist\1n9-match>
; ติดตั้งแบบรายผู้ใช้ (ไม่ต้องสิทธิ์ผู้ดูแล / ไม่มีหน้าต่าง UAC) ลงใน %LOCALAPPDATA%\Programs\1n9-match
; ข้อมูลของลูกค้าอยู่ที่ %LOCALAPPDATA%\1n9-match แยกจากตัวโปรแกรม — ถอนการติดตั้ง/อัปเดตแล้วข้อมูลไม่หาย
; AppId/โฟลเดอร์/ชื่อ exe ต่างจากแชทบอท จึงติดตั้งคู่กันในเครื่องเดียวได้

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#ifndef SourceDir
  #define SourceDir "dist\1n9-match"
#endif

[Setup]
AppId={{6F3C1D52-8B7E-4A41-9C2D-5E7A9B0F4D18}
AppName=1n9 Match
AppVersion={#AppVersion}
AppPublisher=1n9 AI
DefaultDirName={localappdata}\Programs\1n9-match
DefaultGroupName=1n9 Match
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
DisableDirPage=auto
OutputBaseFilename=1n9-Match-Setup
OutputDir=.
SetupIconFile=1n9.ico
UninstallDisplayIcon={app}\1n9-match.exe
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=no
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"
Name: "autostart"; Description: "Start 1n9 Match automatically when I sign in to Windows"; GroupDescription: "Startup:"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\1n9 Match"; Filename: "{app}\1n9-match.exe"
Name: "{autodesktop}\1n9 Match"; Filename: "{app}\1n9-match.exe"; Tasks: desktopicon

[Registry]
; เปิดเองตอนเข้า Windows แบบเงียบ ไม่เด้งเบราว์เซอร์ (ไอคอนที่มุมจอมีเมนูเปิดหน้าเว็บ)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "1n9 Match"; \
    ValueData: """{app}\1n9-match.exe"" --no-browser"; Tasks: autostart; Flags: uninsdeletevalue

[Run]
Filename: "{app}\1n9-match.exe"; Description: "Open 1n9 Match now"; Flags: nowait postinstall skipifsilent

[Code]
{ ปิดโปรแกรมที่รันอยู่ก่อนเขียนทับ/ลบไฟล์ — Restart Manager ปิดแอปที่อยู่ที่มุมจอ (ไม่มีหน้าต่าง) ไม่ได้
  ปิดเฉพาะ 1n9-match.exe กับ qdrant.exe ที่อยู่ในโฟลเดอร์โปรแกรมนี้ ไม่แตะแชทบอทหรือ Qdrant ตัวอื่นของผู้ใช้ }
procedure StopRunningApp();
var
  ResultCode: Integer;
  Ps: String;
begin
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /T /IM 1n9-match.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Ps := '-NoProfile -Command "Get-Process qdrant -ErrorAction SilentlyContinue | Where-Object { $_.Path -like ''' +
        ExpandConstant('{app}') + '\*'' } | Stop-Process -Force"';
  Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Ps, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(800);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  StopRunningApp();
  Result := '';
end;

function InitializeUninstall(): Boolean;
begin
  StopRunningApp();
  Result := True;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    SuppressibleMsgBox('1n9 Match has been removed.' + #13#10 + #13#10 +
           'Your data (documents, settings) was kept in:' + #13#10 +
           ExpandConstant('{localappdata}\1n9-match') + #13#10 +
           'Delete that folder if you also want to remove your data.', mbInformation, MB_OK, IDOK);
end;
