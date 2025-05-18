function extractVideoId(url) {
  try {
    const urlObj = new URL(url);
    if (
      urlObj.hostname === "www.youtube.com" ||
      urlObj.hostname === "youtube.com"
    ) {
      return urlObj.searchParams.get("v");
    } else if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1);
    }
    return null; // Not a valid YouTube URL
  } catch (error) {
    console.error("Invalid URL:", error);
    return null;
  }
}

module.exports = extractVideoId;
