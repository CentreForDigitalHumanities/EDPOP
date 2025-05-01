export async function getPreviewUrlFromIIIFManifest(url) {
    const response = await fetch(new Request(url));
    console.log(response);
    const manifest = await response.json();
    return manifest.thumbnail["@id"];
}
