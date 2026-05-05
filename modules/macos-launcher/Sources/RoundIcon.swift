import AppKit
import Foundation

guard CommandLine.arguments.count == 4 else {
    FileHandle.standardError.write(Data("usage: RoundIcon source output size\n".utf8))
    exit(2)
}

let sourcePath = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
let size = Double(CommandLine.arguments[3]) ?? 1024
let canvasSize = NSSize(width: size, height: size)
let iconScale = 0.82
let artworkScale = 0.76

guard let source = NSImage(contentsOfFile: sourcePath) else {
    FileHandle.standardError.write(Data("unable to read source image\n".utf8))
    exit(1)
}

let image = NSImage(size: canvasSize)
image.lockFocus()

NSColor.clear.setFill()
NSRect(origin: .zero, size: canvasSize).fill()

let inset = size * (1 - iconScale) / 2
let rect = NSRect(x: inset, y: inset, width: size * iconScale, height: size * iconScale)
let radius = rect.width * 0.22
let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
path.addClip()

NSColor(calibratedWhite: 0.96, alpha: 1).setFill()
rect.fill()

let sourceRatio = source.size.width / max(source.size.height, 1)
let artworkSize = NSSize(width: size * artworkScale, height: size * artworkScale)
let artworkRect = NSRect(
    x: (canvasSize.width - artworkSize.width) / 2,
    y: (canvasSize.height - artworkSize.height) / 2,
    width: artworkSize.width,
    height: artworkSize.height
)
let targetRatio = artworkRect.width / artworkRect.height
let drawSize: NSSize
if sourceRatio > targetRatio {
    drawSize = NSSize(width: artworkRect.height * sourceRatio, height: artworkRect.height)
} else {
    drawSize = NSSize(width: artworkRect.width, height: artworkRect.width / max(sourceRatio, 0.01))
}
let drawRect = NSRect(
    x: artworkRect.midX - drawSize.width / 2,
    y: artworkRect.midY - drawSize.height / 2,
    width: drawSize.width,
    height: drawSize.height
)
source.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1)

image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write(Data("unable to render icon\n".utf8))
    exit(1)
}

try png.write(to: URL(fileURLWithPath: outputPath))
