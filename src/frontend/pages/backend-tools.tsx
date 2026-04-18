/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";
import {
  BackendCard,
  BackendLayout,
  CodeBlock,
  Steps,
} from "../components/backend-ui.js";

export const LoginTestPage: FC = () => (
  <BackendLayout title="Ujicoba Login">
    <BackendCard
      icon="🔐"
      title="Ujicoba Login Session"
      descriptions={["Mulai login session dengan scan QR."]}
      actions={[{ href: "/ui/scanqr/demo-session", label: "Buka Halaman Scan QR" }]}
    >
      <Steps
        items={[
          "Pilih session id unik.",
          "Buka halaman scan QR.",
          "Scan QR dari aplikasi WhatsApp.",
        ]}
      />
      <CodeBlock text="/ui/scanqr/demo-session" />
    </BackendCard>
  </BackendLayout>
);

export const LogoutSessionPage: FC<{ sessionId: string }> = (props) => (
  <BackendLayout title="Ujicoba Logout">
    <BackendCard
      icon="🚪"
      title="Ujicoba Logout Session"
      badge={`Sesi: ${props.sessionId}`}
      descriptions={[
        "Gunakan endpoint DELETE untuk logout dan hapus sesi.",
        "Contoh command tersedia di bawah.",
      ]}
      actions={[{ href: `/session/status/${props.sessionId}`, label: "Cek Status Session" }]}
    >
      <CodeBlock
        text={`curl -X DELETE http://localhost:3000/session/${props.sessionId}`}
      />
    </BackendCard>
  </BackendLayout>
);

export const BroadcastServicePage: FC<{ sessionId: string }> = (props) => (
  <BackendLayout title="Service Broadcast">
    <BackendCard
      icon="📢"
      title="Service Pesan Broadcast"
      badge={`Sesi: ${props.sessionId}`}
      descriptions={["Gunakan endpoint broadcast untuk kirim ke banyak nomor."]}
    >
      <Steps
        items={[
          "Siapkan array nomor pada field phones.",
          "Isi message dengan teks broadcast.",
          "Opsional: isi delayMs untuk jeda antar kirim.",
        ]}
      />
      <CodeBlock
        text={`curl -X POST http://localhost:3000/broadcast/${props.sessionId} \\
  -H "Content-Type: application/json" \\
  -d '{"phones":["62812xxxx","62813xxxx"],"message":"Halo","delayMs":2000}'`}
      />
    </BackendCard>
  </BackendLayout>
);

export const StatusServicePage: FC<{ sessionId: string }> = (props) => (
  <BackendLayout title="Service Status">
    <BackendCard
      icon="🟢"
      title="Service Status Session"
      badge={`Sesi: ${props.sessionId}`}
      descriptions={["Gunakan endpoint status untuk membuat status WhatsApp."]}
      actions={[{ href: `/session/status/${props.sessionId}`, label: "Cek Runtime Status" }]}
    >
      <CodeBlock
        text={`curl -X POST http://localhost:3000/status/${props.sessionId} \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Status dari API"}'`}
      />
    </BackendCard>
  </BackendLayout>
);

export const ScanQRHelpPage: FC = () => (
  <BackendLayout title="Ujicoba Login QR">
    <BackendCard
      icon="🧪"
      title="Halaman Ujicoba Login (Scan QR)"
      descriptions={[
        "Masukkan session id lewat URL untuk memulai QR login.",
        "Contoh endpoint:",
      ]}
    >
      <CodeBlock text="/ui/scanqr/demo-session" />
    </BackendCard>
  </BackendLayout>
);

export const SessionReadyPage: FC<{ sessionId: string }> = (props) => (
  <BackendLayout title="Sesi Aktif">
    <BackendCard
      icon="✅"
      title="Sesi Sudah Aktif"
      badge={`Sesi: ${props.sessionId}`}
      descriptions={[
        "WhatsApp sudah terhubung dan siap digunakan.",
        "Tidak perlu scan QR lagi.",
      ]}
      actions={[{ href: `/ui/status-service/${props.sessionId}`, label: "Lihat Status" }]}
    />
  </BackendLayout>
);

export const SessionConnectedPage: FC<{ sessionId: string }> = (props) => (
  <BackendLayout title="Sesi Terhubung">
    <BackendCard
      icon="✅"
      title="Sesi Berhasil Terhubung"
      badge={`Sesi: ${props.sessionId}`}
      descriptions={["WhatsApp berhasil terhubung. Sesi siap digunakan."]}
      actions={[
        { href: `/ui/status-service/${props.sessionId}`, label: "Cek Status Service" },
      ]}
    />
  </BackendLayout>
);

export const QRNotReadyPage: FC<{ sessionId: string }> = (props) => (
  <BackendLayout title="QR Belum Siap">
    <BackendCard
      icon="⏱️"
      title="QR Belum Siap"
      badge={`Sesi: ${props.sessionId}`}
      descriptions={[
        "WhatsApp belum mengirimkan QR code. Mungkin masih proses inisialisasi.",
      ]}
      actions={[{ href: `/session/qr/${props.sessionId}`, label: "Coba Lagi" }]}
    />
  </BackendLayout>
);

export const ScanQRPage: FC<{ sessionId: string; qrImageUrl: string }> = (props) => (
  <BackendLayout title="Scan QR">
    <BackendCard
      icon="📱"
      title="Scan QR untuk Login"
      badge={`Sesi: ${props.sessionId}`}
      descriptions={["Gunakan WhatsApp di ponsel untuk scan QR berikut."]}
      actions={[{ href: `/session/qr/${props.sessionId}`, label: "Refresh QR" }]}
    >
      <div class="qr">
        <img src={props.qrImageUrl} alt="QR Code WhatsApp" width="260" height="260" />
      </div>
      <Steps
        items={[
          "Buka WhatsApp di ponsel.",
          "Masuk ke Perangkat Tertaut.",
          "Pilih Tautkan Perangkat.",
          "Arahkan kamera ke QR di halaman ini.",
        ]}
      />
      <p id="timer">
        <strong>QR kadaluarsa dalam 60 detik</strong>
      </p>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            let seconds = 60;
            const timerEl = document.getElementById("timer");
            const timer = setInterval(() => {
              seconds--;
              if (timerEl) timerEl.innerHTML = "<strong>QR kadaluarsa dalam " + seconds + " detik</strong>";
              if (seconds <= 0) {
                clearInterval(timer);
                window.location.reload();
              }
            }, 1000);

            const pollStatus = setInterval(async () => {
              try {
                const res = await fetch("/session/status/${props.sessionId}");
                const data = await res.json();
                if (data.status === "ready") {
                  clearInterval(timer);
                  clearInterval(pollStatus);
                  window.location.reload();
                }
              } catch (_) {}
            }, 3000);
          `,
        }}
      />
    </BackendCard>
  </BackendLayout>
);
