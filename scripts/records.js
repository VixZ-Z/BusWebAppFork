import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// DB Connection ------------------------------------------------------------

const supabaseUrl = "https://djdyvtfrkuwhpclyszvr.supabase.co";
const supabaseKey = "sb_publishable_uw84FUSa__CMVSPfvcxt0A_cYYqjzJ8";
const supabase = createClient(supabaseUrl, supabaseKey);

// Flatpickr (Calendar Library) ----------------------------------------------------------

flatpickr("#calendar", {
  inline: true,
  locale: "cat",
  defaultDate: "today",
  onChange: handleCalendarChange,
});

// Toggle logic
window.toggleWidget = function (headerEl, contentId) {
  const contentEl = document.getElementById(contentId);
  contentEl.classList.toggle("open");
  headerEl.classList.toggle("open");
};

// Dades --------------------------------------------------------------------------------
let fecha = formatDate("aaaa-mm-dd");

// Files
const containerEl = document.getElementById("rute-rows");
let rowsEl = null;

const totalCondEl = document.querySelector("#tempsCond");
const totalDispEl = document.querySelector("#tempsDisp");
const totalTempsEl = document.querySelector("#tempsTotal");

//Edit
const editBtn = document.querySelector(".edit");
let isEditMode = false;

let editedRows = new Set();
let deletedRows = new Set();

const saveChangesbtn = document.querySelector(".edit-actions-save");
const cancelChangesbtn = document.querySelector(".edit-actions-cancel");

// Init App
initApp();

// Events -------------------------------------------------------------------------------

// EDIT DE LES RUTES
editBtn.addEventListener("click", () => handleEdit());

// CAmbiar tipo de ruta
document.addEventListener("click", async (e) => {
  if (!isEditMode) return;

  const el = e.target;

  // Si ya tiene select, no hacer nada
  if (el.querySelector("select")) return;

  // Guarda el padre antes de modificar el DOM
  const row = el.closest(".rute-rows");
  if (!row) {
    return;
  }

  if (
    el.classList.contains("rute-name") ||
    el.classList.contains("rute-ini") ||
    el.classList.contains("rute-fi")
  ) {
    const currentValue = el.textContent.trim();

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = currentValue;
    input.value = currentValue;
    if (el.classList.contains("rute-name"))
      input.classList.add("rute-name-input");
    else input.classList.add("rute-name-time");

    // Limpiar y reemplazar el contenido
    el.textContent = "";
    el.appendChild(input);
    //debugger;

    // Cuando pierde el foco, guardar valor y reemplazar
    input.addEventListener("blur", () => {
      const newValue = input.value.trim() || currentValue;
      el.textContent = newValue;
    });

    input.focus();
  }

  if (el.classList.contains("rute-type")) {
    const currentValue = el.textContent.trim();
    const select = document.createElement("select");
    select.innerHTML = `
    <option value="C" ${currentValue === "C" ? "selected" : ""}>C</option>
    <option value="D" ${currentValue === "D" ? "selected" : ""}>D</option>
  `;

    // Limpia solo el texto y añade el select
    el.textContent = "";
    el.appendChild(select);
    select.focus();

    // Al perder foco o cambiar valor
    select.addEventListener("blur", async () => {
      const newValue = select.value;
      el.textContent = newValue;
      const nomLinea =
        newValue === "D"
          ? "-----"
          : row.querySelector(".rute-name").textContent;
      row.querySelector(".rute-name").textContent = nomLinea;

      const linea = row.querySelector(".rute-name");
      linea.textContent = nomLinea;
    });

    select.addEventListener("change", () => {
      el.textContent = select.value;
    });
  }

  editedRows.add(row);
});

saveChangesbtn.addEventListener("click", async () => handleEditSave());
cancelChangesbtn.addEventListener("click", () => handleEditCancel());

// Al cargar la página ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
  handleCalendarChange(null, today); // Llama a tu función con la fecha actual
});

// Logic -------------------------------------------------------------------------------------

function handleCalendarChange(selectedDates, dateStr, instance) {
  fecha = dateStr;
  document.getElementById(
    "info-content"
  ).innerHTML = `Informació del dia: <span class="bold">${convertDateFormat(
    dateStr,
    "dd/mm"
  )}</span>`;

  // Si quieres, puedes pasar dateStr a otra función
  fetchAndRenderRoutes(dateStr);
}

async function fetchAndRenderRoutes(date) {
  const { data, error } = await supabase
    .from("routes_test")
    .select("numRuta, Linea, Tipus, h_ini, h_fi, tempsRuta")
    .eq("Dia", date)
    .order("numRuta", { ascending: true });

  if (error) {
    console.error("Error al obtener datos:", error.message);
    return;
  }

  const container = document.getElementById("rute-rows");
  container.innerHTML = ""; // Limpiar anteriores

  let h_cond = 0;
  let h_disp = 0;

  data.forEach((ruta) => {
    const row = document.createElement("div");
    row.classList.add("rute-rows");

    const h_ini = convertTimeFormat(ruta.h_ini, "hh:mm");

    const h_fi = convertTimeFormat(ruta.h_fi, "hh:mm");

    console.log(`La hora de inici:${h_ini} i la de fi: ${h_fi}`);
    const linea = ruta.Linea ? ruta.Linea : "-----";

    row.innerHTML = `
      <div class="rute-num">${ruta.numRuta}</div>
      <div class="rute-name">${linea}</div>
      <div class="rute-type">${ruta.Tipus}</div>
      <div class="rute-ini">${h_ini}</div>
      <div class="rute-fi">${h_fi}</div>
    `;

    const tempsRutaMinutes = hhmmToMinutes(h_fi) - hhmmToMinutes(h_ini);

    if (ruta.Tipus === "C") {
      h_cond += tempsRutaMinutes;
    } else if (ruta.Tipus === "D") {
      h_disp += tempsRutaMinutes;
    }
    row.classList.add(ruta.Tipus); // añade 'C' o 'D' como clase

    container.appendChild(row);
  });
  // Convertir acumulados a hh:mm

  totalCondEl.textContent = minutesToHHMM(h_cond);
  totalDispEl.textContent = minutesToHHMM(h_disp);
  totalTempsEl.textContent = minutesToHHMM(h_cond + h_disp);
}

// Edit Actions -------------------------------------------------------------------------------

function applyEditMode() {
  isEditMode = !isEditMode;
  document.body.classList.toggle("edit-mode", isEditMode); // Aplica estilo visual general

  saveChangesbtn.classList.toggle("hidden");
  cancelChangesbtn.classList.toggle("hidden");
  editBtn.classList.toggle("hidden");
}

function handleEditCancel() {
  applyEditMode();
  editedRows.clear();
  deletedRows.clear();
  initApp();
}
async function handleEditSave() {
  const confirmDelete = confirm("Aquesta acció guardara el canvis");
  if (!confirmDelete) return;

  applyEditMode();
  editedRows.forEach(async (row) => {
    const linea = row.querySelector(".rute-name").textContent.trim();
    const tipus = row.querySelector(".rute-type").textContent.trim();
    const h_ini = row.querySelector(".rute-ini").textContent.trim();
    const h_fi = row.querySelector(".rute-fi").textContent.trim();

    const { error: updateError } = await supabase
      .from("routes_test")
      .update({ Linea: linea, Tipus: tipus, h_ini: h_ini, h_fi: h_fi })
      .eq("Dia", fecha)
      .eq("numRuta", row.querySelector(".rute-num").textContent);

    if (updateError) {
      console.error(
        `Error al actualizar numRuta para ${
          row.querySelector(".rute-num").textContent
        }:`,
        updateError.message
      );
    }
  });

  // FOREACH Async pot donar probelmes ***
  deletedRows.forEach(async (row) => {
    const { error: updateError } = await supabase
      .from("routes_test")
      .delete()
      .eq("Dia", fecha)
      .eq("numRuta", row.querySelector(".rute-num").textContent);

    if (updateError) {
      console.error(
        `Error al actualizar numRuta para ${
          row.querySelector(".rute-num").textContent
        }:`,
        updateError.message
      );
    }
  });

  if (deletedRows.size !== 0) await reorderNumRuta(fecha);
  initApp(fecha);
  editedRows.clear();
  deletedRows.clear();
}

function handleEdit() {
  applyEditMode();

  const rows = document.querySelectorAll(".rute-rows");

  rows.forEach((row) => {
    const existingBtn = row.querySelector(".delete-btn");
    if (!existingBtn) {
      const deleteBtn = document.createElement("button");
      deleteBtn.classList.add("delete-btn");
      deleteBtn.textContent = "🗑️";

      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        row.classList.add("selected");

        setTimeout(() => {
          const confirmDelete = confirm("Això borrarà la ruta, estàs segur?");
          if (!confirmDelete) {
            row.classList.remove("selected");
            return;
          }

          deletedRows.add(row);
          row.remove(); // eliminar visualment (no en DB aún)
        }, 150);
      });

      row.appendChild(deleteBtn);
    }

    // Marcar fila como editable
    row.classList.add("editable");
    row.addEventListener("click", () => rowSelected(row));
  });
}

function rowSelected(row) {
  if (!isEditMode) return;

  document.querySelectorAll(".rute-rows.selected").forEach((r) => {
    r.classList.remove("selected");
  });

  row.classList.add("selected");
}

async function reorderNumRuta(date) {
  const { data, error } = await supabase
    .from("routes_test")
    .select("Dia, numRuta")
    .eq("Dia", date)
    .order("numRuta", { ascending: true });

  if (error) {
    console.error("Error al obtener rutas:", error.message);
    return;
  }

  // Reasignar numRuta en orden consecutivo
  for (let i = 0; i < data.length; i++) {
    const ruta = data[i];
    const nuevoNum = i + 1;

    if (ruta.numRuta !== nuevoNum) {
      const { error: updateError } = await supabase
        .from("routes_test")
        .update({ numRuta: nuevoNum })
        .eq("Dia", ruta.Dia)
        .eq("numRuta", ruta.numRuta); // usar valores antiguos para localizar el registro

      if (updateError) {
        console.error(
          `Error al actualizar numRuta para ${ruta.numRuta}:`,
          updateError.message
        );
      }
    }
  }

  console.log("Reordenamiento completado.");
}

// App State

async function initApp() {
  await reorderNumRuta(fecha);
  await fetchAndRenderRoutes(fecha);
}

// Time Conversions and Operations ------------------------------------------------------

function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const totalSeconds = h * 3600 + m * 60;
  return Math.ceil(totalSeconds / 60); // redondea al alza
}

// Convierte minutos totales a "hh:mm"
function minutesToHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function convertTimeFormat(timeStr, format) {
  switch (format) {
    case "hh:mm":
      return timeStr.slice(0, 5);
    default:
      console.warn("Formato no reconocido");
      return timeStr;
  }
}

function convertDateFormat(dateStr, format) {
  if (!dateStr || typeof dateStr !== "string") return "";

  const [year, month, day] = dateStr.split("-");

  switch (format) {
    case "dia":
      return day;
    case "dd/mm":
      return `${day}/${month}`;
    case "dd/mm/aaaa":
      return `${day}/${month}/${year}`;
    case "dd-mm-aaaa":
      return `${day}-${month}-${year}`;
    case "aaaa/mm/dd":
      return `${year}/${month}/${day}`;
    case "aaaa-mm-dd":
      return `${year}-${month}-${day}`;
    default:
      console.warn("Formato no reconocido");
      return dateStr;
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
