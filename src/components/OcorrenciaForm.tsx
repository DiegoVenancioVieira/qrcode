"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Copy,
  ImagePlus,
  Loader2,
  LocateFixed,
  MapPin,
  Mic,
  Send,
  Square,
  Trash2,
  Video,
  X,
} from "lucide-react";

export type CategoriaForm = {
  slug: string;
  titulo: string;
  descricao: string;
  icone: ReactNode;
};

type Limites = { fotos: number; fotoBytes: number; videoBytes: number; audioBytes: number; descricao: number };

type Foto = { id: string; arquivo: File; url: string };
type Local = { lat: number; lng: number; precisao: number };

const AUDIO_MAX_S = 120;
const FOTO_MAX_LADO = 1600;
const CHAVE_PROTOCOLOS = "ocorrencias:protocolos";

const mb = (b: number) => `${Math.round(b / 1024 / 1024)} MB`;

/**
 * Reduz a foto para no máx. 1600 px e JPEG ~80% antes do envio: uma foto de
 * celular cai de 4–8 MB para ~300 KB, o que importa em 3G e no armazenamento.
 * Formatos que o navegador não decodifica (ex.: HEIC) seguem como estão.
 */
async function comprimirFoto(arquivo: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, FOTO_MAX_LADO / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.8));
    if (!blob || blob.size >= arquivo.size) return arquivo;
    return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}

function lembrarProtocolo(protocolo: string) {
  try {
    const lista: string[] = JSON.parse(localStorage.getItem(CHAVE_PROTOCOLOS) ?? "[]");
    localStorage.setItem(CHAVE_PROTOCOLOS, JSON.stringify([protocolo, ...lista].slice(0, 20)));
  } catch {
    /* modo privado ou armazenamento bloqueado: segue sem lembrar */
  }
}

function Secao({ titulo, children, dica }: { titulo: string; dica?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-slate-800">{titulo}</h2>
      {dica && <p className="mt-0.5 text-sm text-slate-500">{dica}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const botaoSecundario =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-primaria-300 hover:text-primaria-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500 disabled:opacity-50";

export default function OcorrenciaForm({
  categorias,
  aviso,
  limites,
}: {
  categorias: CategoriaForm[];
  aviso: string;
  limites: Limites;
}) {
  const [categoria, setCategoria] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [video, setVideo] = useState<{ arquivo: File; url: string } | null>(null);
  const [audio, setAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [gravando, setGravando] = useState(0); // segundos; 0 = parado
  const [local, setLocal] = useState<Local | null>(null);
  const [buscandoLocal, setBuscandoLocal] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [referencia, setReferencia] = useState("");
  const [contato, setContato] = useState({ nome: "", telefone: "", email: "" });
  const [mostrarContato, setMostrarContato] = useState(false);
  const [enviando, setEnviando] = useState<number | null>(null); // % do upload
  const [erro, setErro] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputFotoCamera = useRef<HTMLInputElement>(null);
  const inputFotoGaleria = useRef<HTMLInputElement>(null);
  const inputVideo = useRef<HTMLInputElement>(null);

  // Libera as URLs de pré-visualização e o microfone ao sair da página.
  const urls = useRef<string[]>([]);
  useEffect(() => {
    const lista = urls.current;
    return () => {
      lista.forEach((u) => URL.revokeObjectURL(u));
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
    };
  }, []);
  const novaUrl = (b: Blob) => {
    const u = URL.createObjectURL(b);
    urls.current.push(u);
    return u;
  };

  const cat = categorias.find((c) => c.slug === categoria);

  async function adicionarFotos(lista: FileList | null) {
    if (!lista) return;
    setErro(null);
    const vagas = limites.fotos - fotos.length;
    const escolhidas = Array.from(lista).filter((f) => f.type.startsWith("image/")).slice(0, vagas);
    if (lista.length > vagas) setErro(`Máximo de ${limites.fotos} fotos.`);
    const prontas = await Promise.all(escolhidas.map(comprimirFoto));
    const grandes = prontas.filter((f) => f.size > limites.fotoBytes);
    if (grandes.length) setErro(`Foto acima de ${mb(limites.fotoBytes)} foi ignorada.`);
    setFotos((atual) => [
      ...atual,
      ...prontas
        .filter((f) => f.size <= limites.fotoBytes)
        .map((arquivo) => ({ id: crypto.randomUUID(), arquivo, url: novaUrl(arquivo) })),
    ]);
  }

  function escolherVideo(lista: FileList | null) {
    const arquivo = lista?.[0];
    if (!arquivo) return;
    if (arquivo.size > limites.videoBytes) {
      setErro(`O vídeo passa de ${mb(limites.videoBytes)}. Grave um trecho mais curto.`);
      return;
    }
    setErro(null);
    setVideo({ arquivo, url: novaUrl(arquivo) });
  }

  async function gravarAudio() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      const partes: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(partes, { type: rec.mimeType.split(";")[0] || "audio/webm" });
        setAudio({ blob, url: novaUrl(blob) });
        setGravando(0);
        if (timer.current) clearInterval(timer.current);
      };
      rec.start(1000);
      recorder.current = rec;
      setGravando(1);
      const inicio = Date.now();
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - inicio) / 1000) + 1;
        setGravando(s);
        if (s >= AUDIO_MAX_S && rec.state === "recording") rec.stop();
      }, 500);
    } catch {
      setErro("Não foi possível usar o microfone. Verifique a permissão do navegador.");
    }
  }

  function pararAudio() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function obterLocal() {
    setErroLocal(null);
    if (!("geolocation" in navigator)) {
      setErroLocal("Seu aparelho não informa a localização. Descreva o local abaixo.");
      return;
    }
    setBuscandoLocal(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocal({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precisao: Math.round(pos.coords.accuracy),
        });
        setBuscandoLocal(false);
      },
      (e) => {
        setBuscandoLocal(false);
        setErroLocal(
          e.code === e.PERMISSION_DENIED
            ? "Permissão de localização negada. Libere no navegador ou descreva o local abaixo."
            : "Não foi possível obter a localização. Tente ao ar livre ou descreva o local abaixo.",
        );
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
    );
  }

  function enviar() {
    setErro(null);
    if (!categoria) return setErro("Escolha o tipo de problema.");
    if (!local && referencia.trim().length < 5) {
      return setErro("Informe o local: toque em “Usar minha localização” ou escreva um ponto de referência.");
    }
    if (descricao.trim().length < 5 && fotos.length === 0 && !video && !audio) {
      return setErro("Descreva o problema ou envie uma foto, vídeo ou áudio.");
    }

    const form = new FormData();
    form.set("categoria", categoria);
    form.set("descricao", descricao);
    form.set("referencia", referencia);
    if (local) {
      form.set("lat", String(local.lat));
      form.set("lng", String(local.lng));
      form.set("precisao", String(local.precisao));
    }
    if (mostrarContato) {
      form.set("nome", contato.nome);
      form.set("telefone", contato.telefone);
      form.set("email", contato.email);
    }
    fotos.forEach((f) => form.append("midias", f.arquivo));
    if (video) form.append("midias", video.arquivo);
    if (audio) {
      const ext = audio.blob.type.includes("mp4") ? "m4a" : audio.blob.type.includes("ogg") ? "ogg" : "webm";
      form.append("midias", new File([audio.blob], `audio.${ext}`, { type: audio.blob.type }));
    }

    // XHR em vez de fetch para mostrar o progresso do upload (vídeos em 3G).
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/ocorrencias");
    xhr.upload.onprogress = (e) => e.lengthComputable && setEnviando(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setEnviando(null);
      let corpo: { protocolo?: string; detail?: string } = {};
      try {
        corpo = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status === 201 && corpo.protocolo) {
        lembrarProtocolo(corpo.protocolo);
        setProtocolo(corpo.protocolo);
        window.scrollTo({ top: 0 });
      } else {
        setErro(corpo.detail ?? "Não foi possível enviar agora. Tente novamente.");
      }
    };
    xhr.onerror = () => {
      setEnviando(null);
      setErro("Sem conexão. Verifique a internet e tente novamente — seus dados continuam aqui.");
    };
    setEnviando(0);
    xhr.send(form);
  }

  if (protocolo) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <CheckCircle2 className="h-14 w-14 text-primaria-600" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-bold text-slate-800">Ocorrência registrada!</h2>
        <p className="mt-1 text-sm text-slate-500">Guarde o número do protocolo para acompanhar:</p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(protocolo).then(() => setCopiado(true), () => {});
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primaria-50 px-4 py-3 font-mono text-xl font-bold tracking-wider text-primaria-700"
        >
          {protocolo}
          <Copy className="h-4 w-4" aria-label="Copiar protocolo" />
        </button>
        {copiado && <p className="mt-1 text-xs text-slate-500">Copiado.</p>}
        <div className="mt-6 flex w-full flex-col gap-2">
          <Link
            href={`/ocorrencias/acompanhar?protocolo=${protocolo}`}
            className="rounded-xl bg-primaria-600 px-4 py-3 font-semibold text-white hover:bg-primaria-700"
          >
            Acompanhar ocorrência
          </Link>
          <button type="button" onClick={() => location.reload()} className={botaoSecundario}>
            Registrar outra
          </button>
          <Link href="/" className="py-2 text-sm text-slate-500 hover:text-slate-700">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  if (!cat) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {categorias.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setCategoria(c.slug)}
            className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-all hover:border-primaria-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500 active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primaria-50 text-primaria-600">
              {c.icone}
            </span>
            <span className="text-sm leading-tight font-semibold text-slate-800">{c.titulo}</span>
            <span className="text-xs leading-snug text-slate-500">{c.descricao}</span>
          </button>
        ))}
      </div>
    );
  }

  const ocupado = enviando !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-primaria-300 bg-primaria-50 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primaria-600">
          {cat.icone}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-800">{cat.titulo}</span>
          <span className="block truncate text-xs text-slate-500">{cat.descricao}</span>
        </span>
        <button
          type="button"
          onClick={() => setCategoria(null)}
          disabled={ocupado}
          className="flex items-center gap-1 text-sm font-medium text-primaria-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Trocar
        </button>
      </div>

      <Secao titulo="Onde fica?" dica="A localização ajuda a equipe a chegar ao local exato.">
        {local ? (
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primaria-600" aria-hidden="true" />
            <span className="flex-1">
              <span className="block font-medium text-slate-700">Localização capturada</span>
              <span className="block text-slate-500">
                Precisão de ~{local.precisao} m ·{" "}
                <a
                  href={`https://www.openstreetmap.org/?mlat=${local.lat}&mlon=${local.lng}#map=18/${local.lat}/${local.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primaria-700 underline"
                >
                  ver no mapa
                </a>
              </span>
            </span>
            <button type="button" onClick={() => setLocal(null)} aria-label="Remover localização">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={obterLocal} disabled={buscandoLocal} className={`${botaoSecundario} w-full`}>
            {buscandoLocal ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
            )}
            {buscandoLocal ? "Obtendo localização…" : "Usar minha localização"}
          </button>
        )}
        {erroLocal && <p className="mt-2 text-sm text-amber-700">{erroLocal}</p>}
        <textarea
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Endereço ou ponto de referência (ex.: Rua X, em frente à escola Y)"
          className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-primaria-500 focus:bg-white focus:outline-none"
        />
      </Secao>

      <Secao titulo="O que está acontecendo?">
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={limites.descricao}
          rows={4}
          placeholder="Descreva o problema. Ex.: poste apagado há 3 dias, rua muito escura à noite."
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-primaria-500 focus:bg-white focus:outline-none"
        />
        <p className="mt-1 text-right text-xs text-slate-400">
          {descricao.length}/{limites.descricao}
        </p>
      </Secao>

      <Secao titulo="Fotos, vídeo e áudio" dica="Opcional, mas ajuda muito na análise.">
        <input ref={inputFotoCamera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { adicionarFotos(e.target.files); e.target.value = ""; }} />
        <input ref={inputFotoGaleria} type="file" accept="image/*" multiple hidden onChange={(e) => { adicionarFotos(e.target.files); e.target.value = ""; }} />
        <input ref={inputVideo} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { escolherVideo(e.target.files); e.target.value = ""; }} />

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={botaoSecundario} disabled={fotos.length >= limites.fotos} onClick={() => inputFotoCamera.current?.click()}>
            <Camera className="h-4 w-4" aria-hidden="true" /> Tirar foto
          </button>
          <button type="button" className={botaoSecundario} disabled={fotos.length >= limites.fotos} onClick={() => inputFotoGaleria.current?.click()}>
            <ImagePlus className="h-4 w-4" aria-hidden="true" /> Da galeria
          </button>
          <button type="button" className={botaoSecundario} disabled={!!video} onClick={() => inputVideo.current?.click()}>
            <Video className="h-4 w-4" aria-hidden="true" /> Vídeo
          </button>
          {gravando ? (
            <button type="button" className={`${botaoSecundario} border-red-300 text-red-600`} onClick={pararAudio}>
              <Square className="h-4 w-4 fill-current" aria-hidden="true" /> Parar {gravando}s
            </button>
          ) : (
            <button type="button" className={botaoSecundario} disabled={!!audio} onClick={gravarAudio}>
              <Mic className="h-4 w-4" aria-hidden="true" /> Gravar áudio
            </button>
          )}
        </div>

        {fotos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {fotos.map((f) => (
              <div key={f.id} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização local (blob:) */}
                <img src={f.url} alt="Foto anexada" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remover foto"
                  onClick={() => setFotos((l) => l.filter((x) => x.id !== f.id))}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {video && (
          <div className="relative mt-3">
            <video src={video.url} controls playsInline className="w-full rounded-xl bg-black" />
            <button type="button" aria-label="Remover vídeo" onClick={() => setVideo(null)} className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
        {audio && (
          <div className="mt-3 flex items-center gap-2">
            <audio src={audio.url} controls className="h-10 flex-1" />
            <button type="button" aria-label="Remover áudio" onClick={() => setAudio(null)} className="rounded-full p-2 text-slate-400 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Até {limites.fotos} fotos, 1 vídeo (máx. {mb(limites.videoBytes)}) e 1 áudio (até {AUDIO_MAX_S / 60} min).
        </p>
      </Secao>

      <Secao titulo="Quer receber retorno?">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={mostrarContato} onChange={(e) => setMostrarContato(e.target.checked)} className="h-4 w-4 accent-primaria-600" />
          Informar meus dados de contato (opcional)
        </label>
        {!mostrarContato && (
          <p className="mt-1 text-xs text-slate-500">Sem contato, o registro é anônimo. Você acompanha pelo protocolo.</p>
        )}
        {mostrarContato && (
          <div className="mt-3 flex flex-col gap-2">
            {(
              [
                ["nome", "Nome", "text", "name"],
                ["telefone", "Telefone / WhatsApp", "tel", "tel"],
                ["email", "E-mail", "email", "email"],
              ] as const
            ).map(([campo, rotulo, tipo, auto]) => (
              <input
                key={campo}
                type={tipo}
                autoComplete={auto}
                placeholder={rotulo}
                aria-label={rotulo}
                value={contato[campo]}
                onChange={(e) => setContato((c) => ({ ...c, [campo]: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-primaria-500 focus:bg-white focus:outline-none"
              />
            ))}
          </div>
        )}
      </Secao>

      {erro && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={enviar}
        disabled={ocupado || gravando > 0}
        className="flex items-center justify-center gap-2 rounded-2xl bg-primaria-600 px-4 py-4 text-base font-semibold text-white shadow-lg transition-colors hover:bg-primaria-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500 focus-visible:ring-offset-2 disabled:bg-slate-300"
      >
        {ocupado ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
        {ocupado ? `Enviando… ${enviando}%` : "Enviar ocorrência"}
      </button>
      <p className="text-center text-xs leading-snug text-slate-400">{aviso}</p>
    </div>
  );
}
