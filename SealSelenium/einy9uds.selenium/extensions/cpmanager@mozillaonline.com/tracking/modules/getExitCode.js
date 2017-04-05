// using unicode variant of strings and functions
const WinABI = ctypes.size_t.size == 8 ?
  ctypes.default_abi :
  ctypes.winapi_abi;
const BOOL = ctypes.bool;
const BYTE = ctypes.unsigned_char;
const DWORD = ctypes.unsigned_long;
const HANDLE = ctypes.voidptr_t;
const HMODULE = HANDLE;
const LONG = ctypes.long;
const LPDWORD = DWORD.ptr;
const LPTSTR = (ctypes.char16_t || ctypes.jschar).ptr;
const PDWORD = DWORD.ptr;
const TCHAR = (ctypes.char16_t || ctypes.jschar);
const ULONG_PTR = ctypes.unsigned_long.ptr;

const ERROR_SUCCESS = 0x0;
const ERROR_NO_MORE_FILES = OS.Constants.Win.ERROR_NO_MORE_FILES;
const INFINITE = 0xffffffff;
const INVALID_HANDLE_VALUE = HANDLE(OS.Constants.Win.INVALID_HANDLE_VALUE);
const MAX_PATH = OS.Constants.Win.MAX_PATH;
const PROCESS_QUERY_INFORMATION = 0x0400;
const STILL_ACTIVE = ctypes.UInt64(259);
const SYNCHRONIZE = 0x00100000;
const TH32CS_SNAPPROCESS = 0x00000002;
const WAIT_OBJECT_0 = ctypes.UInt64(0x00000000);
const WAIT_FAILED = ctypes.UInt64(0xffffffff);

const PROCESSENTRY32 = new ctypes.StructType("PROCESSENTRY32", [
  {"dwSize": DWORD},
  {"cntUsage": DWORD},
  {"th32ProcessID": DWORD},
  {"th32DefaultHeapID": ULONG_PTR},
  {"th32ModuleID": DWORD},
  {"cntThreads": DWORD},
  {"th32ParentProcessID": DWORD},
  {"pcPriClassBase": LONG},
  {"dwFlags": DWORD},
  {"szExeFile": TCHAR.array(MAX_PATH)},
]);
const LPPROCESSENTRY32 = PROCESSENTRY32.ptr;

const kernel32 = ctypes.open("kernel32");

const GetCurrentProcessId = kernel32.declare("GetCurrentProcessId",
  WinABI, DWORD);
const CreateToolhelp32Snapshot = kernel32.declare("CreateToolhelp32Snapshot",
  WinABI, HANDLE, DWORD, DWORD);
const Process32First = kernel32.declare("Process32FirstW",
  WinABI, BOOL, HANDLE, LPPROCESSENTRY32);
const Process32Next = kernel32.declare("Process32NextW",
  WinABI, BOOL, HANDLE, LPPROCESSENTRY32);
const OpenProcess = kernel32.declare("OpenProcess",
  WinABI, HANDLE, DWORD, BOOL, DWORD);
const CloseHandle = kernel32.declare("CloseHandle",
  WinABI, BOOL, HANDLE);
const GetExitCodeProcess = kernel32.declare("GetExitCodeProcess",
  WinABI, BOOL, HANDLE, LPDWORD);
const WaitForSingleObject = kernel32.declare("WaitForSingleObject",
  WinABI, DWORD, HANDLE, DWORD);

let equal = function(x, y) {
  return !ctypes.UInt64.compare(x, y);
};

let reportError = function(aMessage, aCode) {
  postMessage({
    type: "error",
    message: (aMessage || "UnknownError"),
    code: (isNaN(aCode) ? 0 : aCode)
  });
};

/**
 * Find one child process with the given file name, and get its process id.
 *
 * @param  aExeName
 *         Executable's leafname, comparison will be case insensitive.
 *
 * @return Process id or false if no such process exists.
 */
let getPIDForFile = function(aExeName) {
  let snapshotProcess = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if (snapshotProcess.toString() == INVALID_HANDLE_VALUE.toString()) {
    reportError("CreateToolhelp32Snapshot", ctypes.winLastError);
    return false;
  };

  let process = new PROCESSENTRY32();
  process.dwSize = PROCESSENTRY32.size;

  if (!Process32First(snapshotProcess, process.address())) {
    reportError("Process32First", ctypes.winLastError);
    CloseHandle(snapshotProcess);
    return false;
  }

  let curPID = GetCurrentProcessId();
  let childPID = ctypes.UInt64(0);

  do {
    let parentPID = process.th32ParentProcessID;
    let exeName = process.szExeFile.readString().toLowerCase();

    if (!equal(parentPID, curPID) || (exeName != aExeName.toLowerCase())) {
      continue;
    }

    childPID = process.th32ProcessID;
    break;
  } while (Process32Next(snapshotProcess, process.address()));

  if ((ctypes.winLastError != ERROR_SUCCESS) &&
      (ctypes.winLastError != ERROR_NO_MORE_FILES)) {
    reportError("Process32Next", ctypes.winLastError);
    CloseHandle(snapshotProcess);
    return false;
  };

  CloseHandle(snapshotProcess);

  if (equal(childPID, ctypes.UInt64(0))) {
    reportError("InvalidProcessID", childPID.toString());
    return false;
  }

  return childPID;
};

let getExitCodeForFile = function (aExeName) {
  let pid = getPIDForFile(aExeName);
  if (!pid) {
    return false;
  }

  let access = PROCESS_QUERY_INFORMATION | SYNCHRONIZE;
  let handleProcess = OpenProcess(access, false, pid);
  if (handleProcess.isNull()) {
    reportError("OpenProcess", ctypes.winLastError);
    return false;
  }

  let exit = new DWORD();
  if (!GetExitCodeProcess(handleProcess, exit.address())) {
    reportError("GetExitCodeProcess", ctypes.winLastError);
    CloseHandle(handleProcess);
    return false;
  }

  if (!equal(exit.value, STILL_ACTIVE)) {
    CloseHandle(handleProcess);
    return exit;
  }

  let rv = WaitForSingleObject(handleProcess, INFINITE);
  if (equal(rv, WAIT_OBJECT_0)) {
    if (!GetExitCodeProcess(handleProcess, exit.address())) {
      reportError("GetExitCodeProcess", ctypes.winLastError);
      CloseHandle(handleProcess);
      return false;
    }
    CloseHandle(handleProcess);
    return exit;
  } else if (equal(rv, WAIT_FAILED)) {
    reportError("WaitForSingleObject", ctypes.winLastError);
    CloseHandle(handleProcess);
    return false;
  } else {
    reportError("WaitForSingleObject", rv.toString());
    CloseHandle(handleProcess);
    return false;
  }
};

onmessage = function(aEvt) {
  let exeName = aEvt.data && aEvt.data.exeName;
  if (!exeName) {
    return;
  }

  let exit = getExitCodeForFile(exeName);
  if (exit) {
    postMessage({
      type: "exitcode",
      exeName: exeName,
      code: exit.value.toString()
    });
  }

  close();
};
