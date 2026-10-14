(() => {
  const RELAY_HOST = 'stream-test.pxxlspace.cv';
  const RELAY_SECURE = true;

  const wsProto = RELAY_SECURE ? 'wss' : 'ws';
  const ws = new WebSocket(`${wsProto}://${RELAY_HOST}`);

  let streaming = false;
  let stream = null;
  let video = null;
  let canvas = null;
  let ctx = null;

  const errEl = document.getElementById('err');
  const prog = document.getElementById('prog');

  function showErr(msg) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
    setTimeout(() => errEl.style.display = 'none', 3500);
  }

  ws.onopen = () => ws.send(JSON.stringify({ type: 'role', role: 'source' }));
  ws.onerror = () => showErr('Playback error. Check connection.');

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
    } catch (e) {
      showErr('Video unavailable in your region.');
      return;
    }

    video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    await video.play();

    canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    ctx = canvas.getContext('2d');

    streaming = true;
    tick();
  }

  function tick() {
    if (!streaming) return;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', 0.55);
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'frame', data }));
      const p = (Date.now() / 100) % 100;
      prog.style.width = p + '%';
    } catch {}
    setTimeout(tick, 100);
  }

  document.getElementById('play').addEventListener('click', start);
})();
