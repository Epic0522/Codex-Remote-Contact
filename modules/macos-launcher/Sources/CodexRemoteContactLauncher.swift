import AppKit
import Foundation

private let projectDir: String = {
    if let resourceURL = Bundle.main.url(forResource: "ProjectDir", withExtension: "txt"),
       let value = try? String(contentsOf: resourceURL, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines),
       !value.isEmpty {
        return value
    }
    let appURL = Bundle.main.bundleURL
    let buildURL = appURL.deletingLastPathComponent()
    return buildURL.deletingLastPathComponent().path
}()
private let hubPort = 3789
private let plistPath = "\(projectDir)/config/local.codexremotecontact.chat-hub.plist"
private let clientAppPath = "\(projectDir)/build/CodexRemoteContactClient.app"
private let llbotAppPath = "\(projectDir)/modules/qq-llbot/LLBot.app"
private let keepAwakePidPath = "\(projectDir)/data/keep-awake.pid"
private let brightnessStatePath = "\(projectDir)/data/previous-brightness.txt"
private let backlightOffScriptPath = "\(projectDir)/modules/system-control/backlight-off-keep-awake.command"
private let backlightRestoreScriptPath = "\(projectDir)/modules/system-control/backlight-restore.command"

final class CodexRemoteContactLauncherApp: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private let statusLabel = NSTextField(labelWithString: "正在检查状态...")
    private var statusTimer: Timer?
    private var buttons: [NSButton] = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        buildMenu()
        buildWindow()
        refreshStatus()
        statusTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in
            self?.refreshStatus()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag {
            window?.makeKeyAndOrderFront(nil)
        }
        NSApp.activate(ignoringOtherApps: true)
        return true
    }

    @objc private func closeMainWindow() {
        window?.close()
    }

    private func buildMenu() {
        let mainMenu = NSMenu()

        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        let appMenu = NSMenu()
        appMenuItem.submenu = appMenu
        appMenu.addItem(NSMenuItem(
            title: "退出 CodexRemoteContact Launcher",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        ))

        let windowMenuItem = NSMenuItem()
        mainMenu.addItem(windowMenuItem)
        let windowMenu = NSMenu(title: "窗口")
        windowMenuItem.submenu = windowMenu
        let closeItem = NSMenuItem(
            title: "关闭窗口",
            action: #selector(closeMainWindow),
            keyEquivalent: "w"
        )
        closeItem.target = self
        windowMenu.addItem(closeItem)
        windowMenu.addItem(NSMenuItem(
            title: "最小化",
            action: #selector(NSWindow.performMiniaturize(_:)),
            keyEquivalent: "m"
        ))
        NSApp.windowsMenu = windowMenu
        NSApp.mainMenu = mainMenu
    }

    private func buildWindow() {
        let frame = NSRect(x: 0, y: 0, width: 460, height: 480)
        window = NSWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "CodexRemoteContact Launcher"
        window.center()
        window.isReleasedWhenClosed = false

        let root = NSStackView()
        root.orientation = .vertical
        root.alignment = .leading
        root.spacing = 14
        root.edgeInsets = NSEdgeInsets(top: 22, left: 24, bottom: 22, right: 24)
        root.translatesAutoresizingMaskIntoConstraints = false

        let title = NSTextField(labelWithString: "codexremotecontact")
        title.font = .systemFont(ofSize: 28, weight: .bold)

        let subtitle = NSTextField(labelWithString: "远程联系中枢")
        subtitle.font = .systemFont(ofSize: 13, weight: .regular)
        subtitle.textColor = .secondaryLabelColor

        statusLabel.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.lineBreakMode = .byWordWrapping
        statusLabel.maximumNumberOfLines = 4

        root.addArrangedSubview(title)
        root.addArrangedSubview(subtitle)
        root.addArrangedSubview(statusLabel)

        let grid = NSGridView(views: [
            [makeButton("启动 Hub + 客户端", action: #selector(startHubAndClient)), makeButton("打开 LLBot", action: #selector(openLLBot))],
            [makeButton("黑屏后台运行", action: #selector(startDisplayOff)), makeButton("停止黑屏后台", action: #selector(stopKeepAwake))],
            [makeButton("关闭背光", action: #selector(turnBacklightOff)), makeButton("恢复背光", action: #selector(restoreBacklight))],
            [makeButton("打开控制台网页", action: #selector(openHubWeb)), makeButton("一键退出", action: #selector(stopAll))]
        ])
        grid.rowSpacing = 12
        grid.columnSpacing = 12
        for column in 0..<grid.numberOfColumns {
            grid.column(at: column).xPlacement = .fill
        }
        root.addArrangedSubview(grid)

        let note = NSTextField(labelWithString: "LLBot 仍会按原来的方式自己处理账号登录；这个启动器只负责打开和关闭本机组件。")
        note.font = .systemFont(ofSize: 12)
        note.textColor = .tertiaryLabelColor
        note.lineBreakMode = .byWordWrapping
        note.maximumNumberOfLines = 3
        root.addArrangedSubview(note)

        let content = NSView()
        content.addSubview(root)
        NSLayoutConstraint.activate([
            root.leadingAnchor.constraint(equalTo: content.leadingAnchor),
            root.trailingAnchor.constraint(equalTo: content.trailingAnchor),
            root.topAnchor.constraint(equalTo: content.topAnchor),
            root.bottomAnchor.constraint(equalTo: content.bottomAnchor)
        ])
        window.contentView = content
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func makeButton(_ title: String, action: Selector) -> NSButton {
        let button = NSButton(title: title, target: self, action: action)
        button.bezelStyle = .rounded
        button.controlSize = .large
        button.font = .systemFont(ofSize: 14, weight: .medium)
        button.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            button.widthAnchor.constraint(equalToConstant: 195),
            button.heightAnchor.constraint(equalToConstant: 44)
        ])
        buttons.append(button)
        return button
    }

    @objc private func startHubAndClient() {
        runTask("启动 Hub + 客户端") {
            try startHubIfNeeded()
            _ = run("/usr/bin/open", [clientAppPath])
        }
    }

    @objc private func openLLBot() {
        runTask("打开 LLBot") {
            _ = run("/usr/bin/open", [llbotAppPath])
        }
    }

    @objc private func startDisplayOff() {
        runTask("黑屏后台运行") {
            try startKeepAwakeIfNeeded()
            _ = run("/usr/bin/pmset", ["displaysleepnow"])
        }
    }

    @objc private func stopKeepAwake() {
        runTask("停止黑屏后台") {
            stopKeepAwakeProcess()
        }
    }

    @objc private func turnBacklightOff() {
        runTask("关闭背光") {
            _ = run(backlightOffScriptPath, [])
        }
    }

    @objc private func restoreBacklight() {
        runTask("恢复背光") {
            _ = run(backlightRestoreScriptPath, [])
        }
    }

    @objc private func openHubWeb() {
        runTask("打开控制台网页") {
            try startHubIfNeeded()
            _ = run("/usr/bin/open", ["http://localhost:\(hubPort)"])
        }
    }

    @objc private func stopAll() {
        runTask("一键退出") {
            _ = run(backlightRestoreScriptPath, [], allowFailure: true)
            stopKeepAwakeProcess()
            stopHub()
            _ = run("/usr/bin/osascript", ["-e", "tell application \"CodexRemoteContactClient\" to quit"], allowFailure: true)
            _ = run("/usr/bin/osascript", ["-e", "tell application \"LLBot\" to quit"], allowFailure: true)
        }
    }

    private func runTask(_ name: String, _ work: @escaping () throws -> Void) {
        setButtonsEnabled(false)
        statusLabel.stringValue = "\(name) 中..."
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try work()
                DispatchQueue.main.async {
                    self.statusLabel.stringValue = "\(name) 完成。"
                    self.setButtonsEnabled(true)
                    self.refreshStatus()
                }
            } catch {
                DispatchQueue.main.async {
                    self.statusLabel.stringValue = "\(name) 失败：\(error.localizedDescription)"
                    self.setButtonsEnabled(true)
                    self.refreshStatus()
                }
            }
        }
    }

    private func setButtonsEnabled(_ enabled: Bool) {
        buttons.forEach { $0.isEnabled = enabled }
    }

    private func refreshStatus() {
        let hub = isPortListening(hubPort) ? "Hub 在线" : "Hub 未启动"
        let llbot = isAppRunning("LLBot") ? "LLBot 已打开" : "LLBot 未打开"
        let client = isAppRunning("CodexRemoteContactClient") ? "客户端已打开" : "客户端未打开"
        let awake = isKeepAwakeRunning() ? "黑屏后台已开启" : "黑屏后台未开启"
        let backlight = FileManager.default.fileExists(atPath: brightnessStatePath) ? "背光已关闭" : "背光正常"
        statusLabel.stringValue = "\(hub)\n\(llbot)  ·  \(client)\n\(awake)  ·  \(backlight)"
    }
}

private func startHubIfNeeded() throws {
    guard !isPortListening(hubPort) else { return }
    let domain = "gui/\(getuid())"
    _ = run("/bin/launchctl", ["bootout", domain, plistPath], allowFailure: true)
    _ = run("/bin/launchctl", ["bootstrap", domain, plistPath])
    Thread.sleep(forTimeInterval: 1.0)
    if !isPortListening(hubPort) {
        throw LauncherError.message("Chat Hub 没有启动，请查看 \(projectDir)/chat-hub.err.log")
    }
}

private func stopHub() {
    let domain = "gui/\(getuid())"
    _ = run("/bin/launchctl", ["bootout", domain, plistPath], allowFailure: true)
    if let pid = listeningPid(hubPort) {
        _ = run("/bin/kill", ["-TERM", pid], allowFailure: true)
    }
}

private func startKeepAwakeIfNeeded() throws {
    if isKeepAwakeRunning() { return }
    try FileManager.default.createDirectory(atPath: "\(projectDir)/data", withIntermediateDirectories: true)
    try FileManager.default.createDirectory(atPath: "\(projectDir)/tmp", withIntermediateDirectories: true)
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/caffeinate")
    process.arguments = ["-dimsu"]
    process.standardOutput = FileHandle.nullDevice
    process.standardError = FileHandle.nullDevice
    try process.run()
    try String(process.processIdentifier).write(toFile: keepAwakePidPath, atomically: true, encoding: .utf8)
}

private func stopKeepAwakeProcess() {
    guard let pid = try? String(contentsOfFile: keepAwakePidPath, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines),
          !pid.isEmpty
    else { return }
    _ = run("/bin/kill", [pid], allowFailure: true)
    try? FileManager.default.removeItem(atPath: keepAwakePidPath)
}

private func isKeepAwakeRunning() -> Bool {
    guard let pid = try? String(contentsOfFile: keepAwakePidPath, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines),
          !pid.isEmpty
    else { return false }
    return run("/bin/kill", ["-0", pid], allowFailure: true).status == 0
}

private func isAppRunning(_ appName: String) -> Bool {
    let result = run("/usr/bin/pgrep", ["-x", appName], allowFailure: true)
    return result.status == 0
}

private func isPortListening(_ port: Int) -> Bool {
    listeningPid(port) != nil
}

private func listeningPid(_ port: Int) -> String? {
    let result = run("/usr/sbin/lsof", ["-tiTCP:\(port)", "-sTCP:LISTEN"], allowFailure: true)
    let pid = result.output.split(whereSeparator: \.isWhitespace).first.map(String.init)
    return pid?.isEmpty == false ? pid : nil
}

@discardableResult
private func run(_ executable: String, _ arguments: [String], allowFailure: Bool = false) -> (status: Int32, output: String) {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: executable)
    process.arguments = arguments
    let pipe = Pipe()
    process.standardOutput = pipe
    process.standardError = pipe
    do {
        try process.run()
        process.waitUntilExit()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        let output = String(data: data, encoding: .utf8) ?? ""
        if process.terminationStatus != 0 && !allowFailure {
            return (process.terminationStatus, output)
        }
        return (process.terminationStatus, output)
    } catch {
        return (1, error.localizedDescription)
    }
}

enum LauncherError: LocalizedError {
    case message(String)

    var errorDescription: String? {
        switch self {
        case .message(let message): return message
        }
    }
}

@main
enum CodexRemoteContactLauncherMain {
    private static let delegate = CodexRemoteContactLauncherApp()

    static func main() {
        let app = NSApplication.shared
        app.delegate = delegate
        app.setActivationPolicy(.regular)
        app.run()
    }
}
