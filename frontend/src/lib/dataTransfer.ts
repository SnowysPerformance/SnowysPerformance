// Shared helpers for the Export / Import feature: turning a JSON object
// into a real downloaded file, copying plain text to the clipboard (with a
// safe fallback when the browser blocks it), and reading an uploaded file
// back into JSON on the way in.

export function downloadJSON(filename: string, data: any) {
  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function safeFileName(name: string) {
  return (name || "export").trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "") || "export";
}

export function readFileAsJSON(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch {
        reject(new Error("That file isn't valid JSON — is it a Snowy's Performance export file?"));
      }
    };
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsText(file);
  });
}
