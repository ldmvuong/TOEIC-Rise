export function loadYouTubeIframeAPI() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }

    const onReady = () => {
      if (window.YT?.Player) resolve();
    };

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        prev?.();
      } finally {
        onReady();
      }
    };

    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const t = setInterval(() => {
        if (window.YT?.Player) {
          clearInterval(t);
          resolve();
        }
      }, 50);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.body.appendChild(tag);
  });
}
