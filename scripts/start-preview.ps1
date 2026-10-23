param([switch]$NoBrowser, [int]$Port = 0, [string]$ReadyFile = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) {
    throw 'Missing dist/index.html. Extract the complete submission folder before running.'
}
# Windows PowerShell 5.1 and the built-in .NET Framework are sufficient.
# The TCP listener binds only to loopback and avoids HTTP URL ACL requirements.
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Collections.Generic;

public sealed class LocalFilmPreview {
    private readonly string projectRoot;
    private readonly TcpListener listener;
    public LocalFilmPreview(string root, int port) {
        projectRoot = Path.GetFullPath(root);
        listener = new TcpListener(IPAddress.Loopback, port);
        listener.Start();
    }
    public int Port { get { return ((IPEndPoint)listener.LocalEndpoint).Port; } }
    public void Run() {
        while (true) {
            TcpClient client = listener.AcceptTcpClient();
            ThreadPool.QueueUserWorkItem(delegate(object state) { Handle((TcpClient)state); }, client);
        }
    }
    private static string Mime(string file) {
        switch (Path.GetExtension(file).ToLowerInvariant()) {
            case ".html": return "text/html; charset=utf-8";
            case ".js": case ".mjs": return "text/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".json": return "application/json; charset=utf-8";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".mp3": return "audio/mpeg";
            case ".mp4": return "video/mp4";
            case ".md": case ".txt": return "text/plain; charset=utf-8";
            default: return "application/octet-stream";
        }
    }
    private static void Header(Stream output, int status, string reason, long length, string extra) {
        byte[] bytes = Encoding.ASCII.GetBytes("HTTP/1.1 " + status + " " + reason + "\r\nContent-Length: " + length +
            "\r\nConnection: close\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\n" + extra + "\r\n");
        output.Write(bytes, 0, bytes.Length);
    }
    private void Handle(TcpClient client) {
        using (client) {
            try {
                client.ReceiveTimeout = 10000;
                client.SendTimeout = 30000;
                Stream output = client.GetStream();
                StreamReader reader = new StreamReader(output, Encoding.ASCII, false, 4096, true);
                string request = reader.ReadLine();
                if (request == null) return;
                string[] parts = request.Split(' ');
                if (parts.Length < 3) { Header(output, 400, "Bad Request", 0, ""); return; }
                var headers = new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
                string line; int count = 0;
                while (!String.IsNullOrEmpty(line = reader.ReadLine())) {
                    if (++count > 100 || line.Length > 8192) { Header(output, 400, "Bad Request", 0, ""); return; }
                    int colon = line.IndexOf(':');
                    if (colon > 0) headers[line.Substring(0, colon).Trim()] = line.Substring(colon + 1).Trim();
                }
                bool head = parts[0] == "HEAD";
                if (!head && parts[0] != "GET") { Header(output, 405, "Method Not Allowed", 0, "Allow: GET, HEAD\r\n"); return; }
                string relative = Uri.UnescapeDataString(parts[1].Split('?')[0]).TrimStart('/');
                if (relative.IndexOf('\\') >= 0 || relative.IndexOf(':') >= 0 || relative.IndexOf('\0') >= 0) {
                    Header(output, 403, "Forbidden", 0, ""); return;
                }
                if (relative.Length == 0) relative = "index.html";
                string webRoot = Path.Combine(projectRoot, "dist");
                string path = Path.GetFullPath(Path.Combine(webRoot, relative.Replace('/', Path.DirectorySeparatorChar)));
                if (!path.StartsWith(webRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) {
                    Header(output, 403, "Forbidden", 0, ""); return;
                }
                // The submission stores the large video only once, under public/video.
                if (relative == "video/journey.mp4" && !File.Exists(path))
                    path = Path.Combine(projectRoot, "public", "video", "journey.mp4");
                if (!File.Exists(path)) { Header(output, 404, "Not Found", 0, ""); return; }
                using (FileStream file = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read)) {
                    long start = 0, end = file.Length - 1; bool partial = false;
                    string range;
                    if (headers.TryGetValue("Range", out range)) {
                        bool valid = range.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase);
                        string[] bounds = valid ? range.Substring(6).Split('-') : new string[0];
                        valid = valid && bounds.Length == 2 && range.IndexOf(',') < 0;
                        if (valid && bounds[0].Length == 0) {
                            long suffix;
                            valid = Int64.TryParse(bounds[1], out suffix) && suffix > 0;
                            if (valid) start = Math.Max(0, file.Length - suffix);
                        } else if (valid) {
                            valid = Int64.TryParse(bounds[0], out start);
                            if (valid && bounds[1].Length > 0) valid = Int64.TryParse(bounds[1], out end);
                            end = Math.Min(end, file.Length - 1);
                        }
                        if (!valid || start < 0 || start >= file.Length || end < start) {
                            Header(output, 416, "Range Not Satisfiable", 0, "Content-Range: bytes */" + file.Length + "\r\n"); return;
                        }
                        partial = true;
                    }
                    long remaining = Math.Max(0, end - start + 1);
                    string extra = "Content-Type: " + Mime(path) + "\r\nAccept-Ranges: bytes\r\n";
                    if (partial) extra += "Content-Range: bytes " + start + "-" + end + "/" + file.Length + "\r\n";
                    Header(output, partial ? 206 : 200, partial ? "Partial Content" : "OK", remaining, extra);
                    if (head) return;
                    file.Position = start;
                    byte[] buffer = new byte[131072];
                    while (remaining > 0) {
                        int read = file.Read(buffer, 0, (int)Math.Min(buffer.Length, remaining));
                        if (read == 0) break;
                        output.Write(buffer, 0, read); remaining -= read;
                    }
                }
            } catch (IOException) { } catch (SocketException) { }
              catch (Exception error) { Console.Error.WriteLine(error.Message); }
        }
    }
}
'@
$server = New-Object LocalFilmPreview($projectRoot, $Port)
$url = 'http://127.0.0.1:' + $server.Port + '/'
Write-Host ''
Write-Host 'Beyond the Light Cone - local preview' -ForegroundColor Cyan
Write-Host ('Open: ' + $url)
Write-Host 'Keep this window open. Close it or press Ctrl+C to stop.'
Write-Host 'Use the offline journey button to play the included MP4.'
if ($ReadyFile) { [System.IO.File]::WriteAllText($ReadyFile, $url) }
if (-not $NoBrowser) { Start-Process -FilePath $url }
$server.Run()
