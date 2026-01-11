import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { openDB } from "https://cdn.jsdelivr.net/npm/idb@7/+esm"; // IndexedDB - Persistencia de datos

// DB Connection ------------------------------------------------------------

const supabaseUrl = "https://djdyvtfrkuwhpclyszvr.supabase.co";
const supabaseKey = "sb_publishable_uw84FUSa__CMVSPfvcxt0A_cYYqjzJ8";
const supabase = createClient(supabaseUrl, supabaseKey);

// Constants ----------------------------------------------------------------

const mainEl = document.querySelector(".main");

// Basic Info
const currentDayEl = document.querySelector(".current-day");
const currentInstantEl = document.querySelector(".current-instant");

// Ruta ---------------------------------------------------------------------
const startTimeEl = document.querySelector(".main-timers .timer-ruta-inici");
const routeNumEl = document.querySelector(".main-timers .route-number");
const endTimeEl = document.querySelector(".main-timers  .timer-ruta-fi");

// Timer Ruta
const timeCountEl = document.querySelector(".time-count");

// Botons de Ruta
const playPauseBtn = document.querySelector(".playORpause");
const playPauseIcon = playPauseBtn.querySelector("svg path");
const stopBtn = document.querySelector(".stop");

// Boton Vaciar localStorage
const eraseBtn = document.querySelector(".new");

// Variables de Ruta
const RouteStatus = {
  Stopped: "Stopped",
  Running: "Running",
  Paused: "Paused",
};

let routeStatus = RouteStatus.Stopped;
let routeNum = await getNextRouteNum(formatDate("aaaa-mm-dd"));

async function getNextRouteNum(fecha) {
  console.log("Entrando en la BD para sacar el siguiente numero");
  const { data, error } = await supabase
    .from("routes_test")
    .select("numRuta", { head: false })
    .eq("Dia", fecha)
    .order("numRuta", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error obteniendo numRuta máximo:", error.message);
    return 1;
  }
  if (data.length === 0) return 1; // No hiha rutes

  console.log(`Numero encontrado ${parseInt(data[0].numRuta) + 1}`);
  return parseInt(data[0].numRuta) + 1;
}

let elapsedTimeMs = 0;
let startTimestamp = null;
let timerIntervalId = null;

// Eventos
playPauseBtn.addEventListener("click", () => checkStatusRoute());
stopBtn.addEventListener("click", () => stopRoute());
//eraseBtn.addEventListener("click", () => clearAppState());

// Popup --------------------------------------------------------------------
const popupEl = document.querySelector(".finish-popup");

// Display
const pop_startTimeEl = document.querySelector(
  ".popup-timers .timer-ruta-inici"
);
const pop_routeNumEl = document.querySelector(".popup-timers .route-number");
const pop_endTimeEl = document.querySelector(".popup-timers  .timer-ruta-fi");

const popupTimer = document.querySelector(".popup-timeElapsed");

const resumeBtn = document.querySelector(".actions-resume");
const saveBtn = document.querySelector(".actions-save");
const deleteBtn = document.querySelector(".actions-delete");

// Variables de popup
let popupActive = false;

// Eventos
resumeBtn.addEventListener("click", () => pop_resumeRoute());
saveBtn.addEventListener("click", () => saveRoute());
deleteBtn.addEventListener("click", () => deleteRoute());

// Al cargar la página ----------------------------------------------------
updateDate();
updateInstant();
setInterval(updateInstant, 60 * 1000); // cada minuto

// App data --------------------------------------------------------------------

window.addEventListener("beforeunload", () => saveAppState());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveAppState();
});

const db = await openDB("appDB", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("estado")) {
      db.createObjectStore("estado"); // clave-valor
    }
  },
});

initApp();

async function saveAppState() {
  try {
    const appState = {
      date: formatDate("dd/mm/aaaa"),
      routeStatus,
      routeNum,
      elapsedTimeMs,
      startTimestamp,
      startTime: startTimeEl.textContent,
      timeCount: timeCountEl.textContent,
    };

    await db.put("estado", appState, "appState");
    console.log("✅ Estado guardado en IndexedDB");
  } catch (err) {
    console.warn("⚠️ Fallo al guardar estado en IndexedDB:", err);
  }
}

// Logica -------------------------------------------------------------------------

// Popup --------------------------------------------------------------------
function pop_resumeRoute() {
  popupEl.classList.add("hidden");

  endTimeEl.textContent = "--:--";
  resumeRoute();
}

async function saveRoute() {
  routeStatus = RouteStatus.Stopped;

  const tipus = document.querySelector('input[name="tipus"]:checked')?.value;
  let nomLinea = tipus === "D" ? null : document.getElementById("linea").value;
  if (nomLinea === "") nomLinea = null;

  const routeData = {
    Dia: formatDate("sql"),
    numRuta: routeNum,
    Linea: nomLinea,
    Tipus: tipus,
    h_ini: startTimeEl.textContent,
    h_fi: endTimeEl.textContent,
    tempsRuta: timeCountEl.textContent,
  };

  const { data, error } = await supabase.from("routes_test").insert([routeData]);

  if (error) alert("Error al guardar la ruta");
  else routeNum += 1;

  popupEl.classList.add("hidden");

  timerRestart();
  statusDisplay();
  updatePlayPauseButton();
}

function deleteRoute() {
  const confirmDelete = confirm("Això borrarà la ruta actual, estàs segur?");
  if (!confirmDelete) return;

  routeStatus = RouteStatus.Stopped;
  timerRestart();

  statusDisplay();
  updatePlayPauseButton();

  popupEl.classList.add("hidden");
}

function showPopup() {
  popupActive = true;
  popupEl.classList.remove("hidden");

  // Conseguimos la informacion del main
  pop_startTimeEl.textContent = startTimeEl.textContent;
  pop_routeNumEl.textContent = routeNumEl.textContent;
  pop_endTimeEl.textContent = endTimeEl.textContent;

  popupTimer.textContent = timeCountEl.textContent;
}

// Ruta -------------------------------------------------------------------
function checkStatusRoute() {
  if (routeStatus === RouteStatus.Stopped) startRoute();
  else if (routeStatus === RouteStatus.Running) pauseRoute();
  else resumeRoute();
  updatePlayPauseButton(); // <-- cambia el ícono y color
}

function pauseRoute() {
  if (routeStatus !== RouteStatus.Running) return;

  elapsedTimeMs += Date.now() - startTimestamp;
  clearInterval(timerIntervalId);
  timerIntervalId = null; // Assegura no utilitzar un timer no existent
  routeStatus = RouteStatus.Paused;
  statusDisplay();
}

function resumeRoute() {
  if (routeStatus !== RouteStatus.Paused) return;

  startTimestamp = Date.now();
  routeStatus = RouteStatus.Running;
  updatePlayPauseButton();
  statusDisplay();

  timerIntervalId = setInterval(() => {
    if (routeStatus === RouteStatus.Running) updateTimer();
  }, 1000);
}

function startRoute() {
  if (routeStatus === RouteStatus.Running) return;

  routeStatus = RouteStatus.Running;
  statusDisplay();

  startTimestamp = Date.now();
  elapsedTimeMs = 0; // reiniciar tiempo acumulado
  startTimeEl.textContent = formatDate("hh:mm");
  routeNumEl.textContent = routeNum;

  updateTimer();

  timerIntervalId = setInterval(() => {
    if (routeStatus === RouteStatus.Running) updateTimer();
  }, 1000);
}

function stopRoute() {
  if (routeStatus === RouteStatus.Stopped) return;

  endTimeEl.textContent = formatDate("hh:mm");
  // Popup
  showPopup();
}

// Funcions generiques de estats -------------------------------------------
function statusDisplay() {
  const routeInfo = document.querySelector(".timer-ruta.main-timers");

  routeInfo.classList.remove("lightgreen", "gold", "red");
  if (routeStatus === RouteStatus.Running) {
    routeInfo.classList.add("lightgreen");
  } else if (routeStatus === RouteStatus.Paused) {
    routeInfo.classList.add("gold");
  }
}
function timerRestart() {
  // Temps trancorregut
  clearInterval(timerIntervalId);
  timerIntervalId = null;

  elapsedTimeMs = 0;
  startTimestamp = null;

  // Valor per defecte als Elements
  startTimeEl.textContent = "--:--";
  routeNumEl.textContent = routeNum;
  endTimeEl.textContent = "--:--";

  timeCountEl.textContent = "00:00:00";
}

function updateTimer() {
  const elapsedMs = elapsedTimeMs + (Date.now() - startTimestamp);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
    2,
    "0"
  );
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  timeCountEl.textContent = `${hours}:${minutes}:${seconds}`;
}

function updateDate() {
  currentDayEl.textContent = formatDate("dd/mm/aaaa");
}

function updateInstant() {
  currentInstantEl.textContent = formatDate("hh:mm");
}

function updatePlayPauseButton() {
  // Limpia todas las clases de estado
  playPauseBtn.classList.remove("paused", "running", "stopped");

  if (routeStatus === RouteStatus.Running) {
    playPauseIcon.setAttribute("d", "M6 19h4V5H6v14zm8-14v14h4V5h-4z"); // Icono de pausa
    playPauseBtn.classList.add("running");
  } else if (routeStatus === RouteStatus.Paused) {
    playPauseIcon.setAttribute("d", "M8 5v14l11-7z"); // Icono de play
    playPauseBtn.classList.add("paused");
  } else {
    playPauseIcon.setAttribute("d", "M8 5v14l11-7z"); // Icono de play
    playPauseBtn.classList.add("stopped");
  }
}

function formatDate(format) {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const fullYear = now.getFullYear();
  const shortYear = String(fullYear).slice(-2);
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  switch (format) {
    case "dd/mm/aaaa":
      return `${day}/${month}/${fullYear}`;
    case "aaaa-mm-dd":
      return `${fullYear}-${month}-${day}`;
    case "dd/mm/aa":
      return `${day}/${month}/${shortYear}`;
    case "hh:mm":
      return `${hours}:${minutes}`;
    case "hh:mm:ss":
      return `${hours}:${minutes}:${seconds}`;
    case "sql": // yyyy-mm-dd
      return `${fullYear}-${month}-${day}`;
    case "iso":
      return now.toISOString();
    default:
      return now.toString();
  }
}

// APP i Storage -----------------------------------------------------

async function initApp() {
  try {
    const savedState = await db.get("estado", "appState");

    if (!savedState) {
      console.log("ℹ️ No hay estado guardado");
      return;
    }

    console.log("📦 Estado recuperado:", savedState);

    const {
      date,
      routeStatus: rs,
      elapsedTimeMs: etm,
      startTimestamp: st,
      startTime,
      timeCount,
    } = savedState;

    const today = formatDate("dd/mm/aaaa");

    routeNum = await getNextRouteNum(formatDate("aaaa-mm-dd"));
    routeNumEl.textContent = routeNum;

    if (date === today) {
      if (rs !== undefined) routeStatus = rs;
      if (etm !== undefined) elapsedTimeMs = etm;
      if (st !== undefined) startTimestamp = st;
      if (startTime !== undefined) startTimeEl.textContent = startTime;
      if (timeCount !== undefined) timeCountEl.textContent = timeCount;

      statusDisplay();
      updatePlayPauseButton();

      if (!timerIntervalId && routeStatus === RouteStatus.Running) {
        timerIntervalId = setInterval(updateTimer, 1000);
      }
    }
  } catch (err) {
    console.warn("⚠️ Fallo al recuperar estado de IndexedDB:", err);
  }
}
