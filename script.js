let mediaRecorder;
let audioChunks = [];
let audioUrl;
let stream;

const recordBtn = document.querySelector('.record-btn');

// Her istemciye benzersiz bir ID ver
const myClientId = Math.random().toString(36).substr(2, 9);

// Ably ayarları
const ably = new Ably.Realtime('4qN9yw.Lp06zw:8OmY_os7YxUEixNfFvBQaTiv3fc3VQT8FB6XJtDJH3Y');
const channel = ably.channels.get('telsiz-kanali');

recordBtn.addEventListener('mousedown', startRecording);
recordBtn.addEventListener('touchstart', startRecording);
recordBtn.addEventListener('mouseup', stopRecording);
recordBtn.addEventListener('mouseleave', stopRecording);
recordBtn.addEventListener('touchend', stopRecording);

// Kanalı dinle, yeni ses gelirse otomatik çal
channel.subscribe('voice', (msg) => {
    if (msg.data && msg.data.audio && msg.data.sender !== myClientId) {
        const audioBlob = base64ToBlob(msg.data.audio, 'audio/webm');
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.play();
    }
});

async function getStream() {
    if (stream) return stream;
    if (!navigator.mediaDevices || !window.MediaRecorder) {
        alert('Tarayıcınız ses kaydını desteklemiyor.');
        throw new Error('Desteklenmiyor');
    }
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return stream;
    } catch (err) {
        alert('Mikrofona erişilemiyor: ' + err.message);
        throw err;
    }
}

async function startRecording(e) {
    e.preventDefault();
    if (mediaRecorder && mediaRecorder.state === 'recording') return;
    try {
        const s = await getStream();
        mediaRecorder = new MediaRecorder(s);
        audioChunks = [];
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        mediaRecorder.onstop = sendToAbly;
        mediaRecorder.start();
        recordBtn.textContent = 'KAYDEDİYOR';
    } catch (err) {
        // Hata zaten gösterildi
    }
}

function stopRecording(e) {
    e.preventDefault();
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.textContent = 'BAS';
    }
}

// Kayıt bitince sesi Ably kanalına gönder
function sendToAbly() {
    if (audioChunks.length === 0) return;
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    // Blob'u base64'e çevirip gönder
    const reader = new FileReader();
    reader.onloadend = function() {
        const base64Audio = reader.result.split(',')[1];
        channel.publish('voice', { audio: base64Audio, sender: myClientId });
    };
    reader.readAsDataURL(audioBlob);
}

// Base64'ten Blob'a çevirici
function base64ToBlob(base64, mime) {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
} 