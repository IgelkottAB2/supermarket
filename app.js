
(() => {
  "use strict";

  const cfg = window.SUPERMARKET_CONFIG;

  if (!cfg) {
    document.body.textContent =
      "Fel: config.js måste laddas före app.js.";
    return;
  }

  const KEY = "igelkotts_supermarket_demo_v1";
  const money = n =>
    Number(n).toLocaleString("sv-SE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " kr";

  const initial = {
    store: cfg.defaultStore,
    objects: [],
    cart: [],
    pant: {},
    pantBalance: 0,
    pantHistory: [],
    shopping: false,
    finished: false
  };

  let state;

  try {
    state = { ...initial, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    state = { ...initial };
  }

  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);

  let activeTab = "overview";
  let tool = "select";
  let selectedId = null;
  let drawing = null;
  let dragging = null;
  let toastTimer;

  const kinds = {
    department: "Avdelning",
    shelf: "Vanlig hylla",
    fridge: "Kyl",
    freezer: "Frys",
    bakery: "Bagerihylla",
    produce: "Frukt- och grönsakshylla",
    clothes: "Klädställ",
    staffed: "Bemannad kassa",
    self: "Självutcheckning",
    emergency: "Nödutgång",
    entrance: "Ingång",
    outgoing: "Utgång",
    scanStart: "Scan & Go Start",
    scanEnd: "Scan & Go Slut",
    info: "Informationsdisk"
  };

  const colors = [
    "#b8e6ff", "#f8d69b", "#c8b5f8",
    "#b3e6c1", "#f7b8d0", "#f5ef9d"
  ];

  // Skapa en sammanhängande demo även om äldre HTML har andra ID:n.
  document.body.innerHTML = `
    <header>
      <h1>IGELKOTTS SUPERMARKET</h1>
      <p>Butikssystem – lokal testversion. Inga riktiga betalningar.</p>
      <nav id="navigation">
        <button data-tab="overview">Översikt</button>
        <button data-tab="map">Bygg butikskarta</button>
        <button data-tab="scan">Scan & Go</button>
        <button data-tab="pant">Pantomat</button>
        <button data-tab="store">Butik</button>
      </nav>
    </header>

    <main>
      <section id="overview" class="page">
        <h2>Översikt</h2>
        <div class="grid">
          <div class="card">
            <div class="muted">Aktuell butik</div>
            <h3 id="overviewStore"></h3>
          </div>
          <div class="card">
            <div class="muted">Avdelningar</div>
            <div class="stat" id="departmentCount">0</div>
          </div>
          <div class="card">
            <div class="muted">Kartobjekt</div>
            <div class="stat" id="objectCount">0</div>
          </div>
          <div class="card">
            <div class="muted">Pantkonto (demo)</div>
            <div class="stat" id="overviewPant">0 kr</div>
          </div>
        </div>
        <div class="notice">
          Detta är första fungerande prototypen.
          Riktiga användarkonton, QR-skanning, personalbehörigheter,
          betalningar och databasanslutning byggs senare.
        </div>
      </section>

      <section id="map" class="page" hidden>
        <h2>Bygg butikskarta</h2>
        <p>Välj verktyg och dra på rutnätet för att skapa ett objekt.
        Välj ett befintligt objekt för att flytta, ändra eller radera det.</p>

        <div class="card">
          <div class="toolbar" id="mapTools"></div>
          <div class="row">
            <button id="deleteObject" class="danger">Radera markerat</button>
            <button id="clearMap" class="danger">Töm hela kartan</button>
          </div>
          <div id="mapCanvas" class="map-canvas"></div>
        </div>

        <div class="card">
          <h3>Markerat objekt</h3>
          <p id="selectionInfo">Inget objekt markerat.</p>
          <div class="row">
            <label>Namn <input id="objectName" placeholder="Objektets namn"></label>
            <label>Färg <input type="color" id="objectColor"></label>
            <button id="saveObject">Spara ändring</button>
          </div>
        </div>
      </section>

      <section id="scan" class="page" hidden>
        <h2>Scan & Go</h2>
        <div class="notice">
          Testläge: välj varor i listan i stället för att använda
          telefonkamera och riktiga streckkoder.
        </div>
        <div class="card">
          <p id="scanStatus"></p>
          <div class="row">
            <button id="startShopping" class="primary">Starta handling</button>
            <button id="cancelShopping" class="danger">Avbryt handling</button>
          </div>
          <div class="row">
            <input id="productSearch" placeholder="Sök vara eller streckkod">
            <select id="productSelect"></select>
            <button id="addProduct" class="primary">Lägg till vara</button>
          </div>
          <div id="productInfo"></div>
        </div>
        <div class="card">
          <h3>Din varukorg</h3>
          <div id="cartLines"></div>
          <p id="discountTotal"></p>
          <div class="total" id="cartTotal"></div>
          <div class="row">
            <button id="finishShopping" class="primary">
              HANDLAT FÄRDIGT
            </button>
            <button id="helpButton">Be om hjälp</button>
          </div>
          <div id="checkoutMessage"></div>
        </div>
      </section>

      <section id="pant" class="page" hidden>
        <h2>Pantomat – simulering</h2>
        <div class="notice">
          Föreställ dig att du har skannat pantautomatens QR-kod.
          Justera sedan antalet förpackningar.
        </div>
        <div class="card">
          <h3>Välj förpackningar</h3>
          <div id="pantCounters"></div>
          <p>Beräknad pant: <strong id="pantAmount"></strong></p>
          <button id="reviewPant" class="primary">PANTA</button>
          <div id="pantReview" hidden>
            <h3>Kontrollera pantningen</h3>
            <p id="pantSummary"></p>
            <button id="confirmPant" class="primary">
              BEKRÄFTA PANTNING
            </button>
          </div>
          <p id="pantMessage"></p>
        </div>
        <div class="card">
          <h3>Affärskonto – pant</h3>
          <div class="total" id="pantBalance"></div>
          <h4>Historik</h4>
          <div id="pantHistory"></div>
        </div>
      </section>

      <section id="store" class="page" hidden>
        <h2>Butiksinställningar</h2>
        <div class="card">
          <label>Butikens namn
            <input id="storeName" maxlength="100">
          </label>
          <button id="saveStore" class="primary">Spara butiksnamn</button>
        </div>
        <div class="card">
          <h3>Om testversionen</h3>
          <p>Informationen sparas lokalt på den här datorn.
          Den delas ännu inte mellan kunder eller personal.</p>
          <button id="resetDemo" class="danger">
            Återställ alla demouppgifter
          </button>
        </div>
      </section>
    </main>
    <div id="toast" hidden></div>
  `;

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 5000);
  }

  function show(tab) {
    activeTab = tab;
    document.querySelectorAll(".page").forEach(el => {
      el.hidden = el.id !== tab;
    });
    document.querySelectorAll("[data-tab]").forEach(el => {
      el.classList.toggle("primary", el.dataset.tab === tab);
    });
    render();
  }

  document.querySelectorAll("[data-tab]").forEach(el => {
    el.addEventListener("click", () => show(el.dataset.tab));
  });

  function renderOverview() {
    $("overviewStore").textContent = state.store;
    $("departmentCount").textContent =
      state.objects.filter(o => o.type === "department").length;
    $("objectCount").textContent = state.objects.length;
    $("overviewPant").textContent = money(state.pantBalance);
  }

  // BUTIKSKARTA
  const snap = n => Math.round(n / 24) * 24;

  function createTools() {
    $("mapTools").innerHTML = "";
    const tools = { select: "Markera / flytta", ...kinds };

    Object.entries(tools).forEach(([id, label]) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.classList.toggle("active", tool === id);
      btn.onclick = () => {
        tool = id;
        createTools();
      };
      $("mapTools").append(btn);
    });
  }

  function intersects(a, b) {
    return a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function validDepartment(obj) {
    if (obj.type !== "department") return true;
    return !state.objects.some(other =>
      other.id !== obj.id &&
      other.type === "department" &&
      intersects(obj, other)
    );
  }

  function newObject(type, x, y, w, h) {
    if (type === "scanStart" &&
      state.objects.filter(o => o.type === type).length >= 3) {
      toast("Högst tre Scan & Go-startpunkter.");
      return;
    }
    if (type === "scanEnd" &&
      state.objects.filter(o => o.type === type).length >= 3) {
      toast("Högst tre Scan & Go-slutpunkter.");
      return;
    }

    const count = state.objects.filter(o => o.type === type).length + 1;
    const obj = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2),
      type, x, y, w, h,
      name: kinds[type] + " " + count,
      color: type === "department"
        ? colors[(count - 1) % colors.length]
        : "#a7d9ef"
    };

    if (type === "emergency") obj.color = "#22bd69";
    if (type === "entrance" || type === "outgoing") obj.color = "#60a5fa";
    if (type === "scanStart") obj.color = "#38d38d";
    if (type === "scanEnd") obj.color = "#ff7777";

    if (!validDepartment(obj)) {
      toast("Avdelningar får inte överlappa varandra.");
      return;
    }

    state.objects.push(obj);
    selectedId = obj.id;
    save();
    renderMap();
  }

  function mapPoint(event) {
    const rect = $("mapCanvas").getBoundingClientRect();
    return {
      x: snap(event.clientX - rect.left),
      y: snap(event.clientY - rect.top)
    };
  }

  const defaultSize = type => {
    if (["emergency", "entrance", "outgoing"].includes(type))
      return [48, 8];
    if (type === "info") return [48, 48];
    if (type.startsWith("scan")) return [72, 48];
    return [96, 72];
  };

  $("mapCanvas").addEventListener("pointerdown", e => {
    if (e.target !== $("mapCanvas")) return;
    if (tool === "select") {
      selectedId = null;
      renderMap();
      return;
    }

    const p = mapPoint(e);
    drawing = p;
    $("mapCanvas").setPointerCapture(e.pointerId);
  });

  $("mapCanvas").addEventListener("pointerup", e => {
    if (!drawing) return;
    const p = mapPoint(e);
    let x = Math.min(p.x, drawing.x);
    let y = Math.min(p.y, drawing.y);
    let w = Math.abs(p.x - drawing.x);
    let h = Math.abs(p.y - drawing.y);

    const [dw, dh] = defaultSize(tool);
    if (w < 24) w = dw;
    if (h < 24) h = dh;

    if (["emergency", "entrance", "outgoing"].includes(tool)) {
      if (h > w) {
        w = 8;
        h = Math.max(48, h);
      } else {
        h = 8;
        w = Math.max(48, w);
      }
    }

    newObject(tool, x, y, w, h);
    drawing = null;
  });

  function renderMap() {
    createTools();
    const canvas = $("mapCanvas");
    canvas.querySelectorAll(".map-object").forEach(el => el.remove());

    const sorted = [...state.objects].sort((a, b) =>
      (a.type === "department" ? -1 : 0) -
      (b.type === "department" ? -1 : 0)
    );

    sorted.forEach(obj => {
      const el = document.createElement("div");
      el.className = "map-object";
      if (obj.type === "department") el.classList.add("department");
      if (obj.type === "emergency") el.classList.add("exit-line");
      if (["entrance", "outgoing"].includes(obj.type))
        el.classList.add("entrance-line");
      if (obj.type === "info") el.classList.add("info");
      if (obj.type === "scanStart") el.classList.add("scan-start");
      if (obj.type === "scanEnd") el.classList.add("scan-end");
      el.classList.toggle("selected", obj.id === selectedId);

      Object.assign(el.style, {
        left: obj.x + "px",
        top: obj.y + "px",
        width: obj.w + "px",
        height: obj.h + "px",
        backgroundColor: obj.color
      });

      el.textContent = obj.type === "info" ? "I" :
        obj.type === "freezer" ? "❄ " + obj.name :
        obj.type === "produce" ? "● " + obj.name :
        obj.type === "clothes" ? "▣ " + obj.name :
        obj.name;

      if (obj.id === selectedId) {
        const handle = document.createElement("span");
        handle.className = "resize-handle";
        el.append(handle);
      }

      el.addEventListener("pointerdown", e => {
        if (tool !== "select") return;
        e.stopPropagation();
        selectedId = obj.id;

        dragging = {
          id: obj.id,
          mode: e.target.classList.contains("resize-handle")
            ? "resize" : "move",
          x: e.clientX, y: e.clientY,
          original: { ...obj }
        };
        el.setPointerCapture(e.pointerId);
        renderSelection();
      });

      el.addEventListener("pointermove", e => {
        if (!dragging || dragging.id !== obj.id) return;
        const dx = snap(e.clientX - dragging.x);
        const dy = snap(e.clientY - dragging.y);

        if (dragging.mode === "move") {
          obj.x = Math.max(0, dragging.original.x + dx);
          obj.y = Math.max(0, dragging.original.y + dy);
        } else {
          obj.w = Math.max(24, dragging.original.w + dx);
          obj.h = Math.max(24, dragging.original.h + dy);
        }

        if (!validDepartment(obj)) {
          Object.assign(obj, dragging.original);
        }

        el.style.left = obj.x + "px";
        el.style.top = obj.y + "px";
        el.style.width = obj.w + "px";
        el.style.height = obj.h + "px";
      });

      el.addEventListener("pointerup", () => {
        dragging = null;
        save();
        renderMap();
      });

      canvas.append(el);
    });

    renderSelection();
    renderOverview();
  }

  function renderSelection() {
    const obj = state.objects.find(o => o.id === selectedId);
    $("selectionInfo").textContent =
      obj ? kinds[obj.type] : "Inget objekt markerat.";
    $("objectName").value = obj?.name || "";
    $("objectColor").value = obj?.color || "#a7d9ef";
    $("objectName").disabled = !obj;
    $("objectColor").disabled = !obj;
    $("saveObject").disabled = !obj;
    $("deleteObject").disabled = !obj;
  }

  $("saveObject").onclick = () => {
    const obj = state.objects.find(o => o.id === selectedId);
    if (!obj) return;
    obj.name = $("objectName").value.trim() || kinds[obj.type];
    obj.color = $("objectColor").value;
    save();
    renderMap();
    toast("Ändringen har sparats.");
  };

  $("deleteObject").onclick = () => {
    if (!selectedId || !confirm("Radera det markerade objektet?")) return;
    state.objects = state.objects.filter(o => o.id !== selectedId);
    selectedId = null;
    save();
    renderMap();
  };

  $("clearMap").onclick = () => {
    if (!confirm("Vill du verkligen radera hela butikskartan?")) return;
    state.objects = [];
    selectedId = null;
    save();
    renderMap();
  };

  // SCAN & GO
  function filteredProducts() {
    const q = $("productSearch").value.trim().toLowerCase();
    return cfg.products.filter(p =>
      [p.name, p.brand, p.id, p.department]
        .some(v => String(v).toLowerCase().includes(q))
    );
  }

  function renderProductOptions() {
    const products = filteredProducts();
    $("productSelect").innerHTML = products.map(p =>
      `<option value="${esc(p.id)}">${esc(p.brand)} ${esc(p.name)}
      – ${money(p.price - p.discount)}</option>`
    ).join("");
    renderProductInfo();
  }

  function renderProductInfo() {
    const p = cfg.products.find(p => p.id === $("productSelect").value);
    $("productInfo").textContent = p
      ? `${p.brand} ${p.name} • ${p.size} • ${p.department} •
         Streckkod: ${p.id}`
      : "Ingen matchande vara hittades.";
  }

  $("productSearch").oninput = renderProductOptions;
  $("productSelect").onchange = renderProductInfo;

  $("startShopping").onclick = () => {
    if (state.shopping || state.finished) return;
    state.shopping = true;
    state.cart = [];
    save();
    renderScan();
    toast("Handlingen har startat (testläge).");
  };

  $("cancelShopping").onclick = () => {
    if (!state.shopping) return;
    if (!confirm("Vill du avbryta handlingen och tömma varukorgen?")) return;
    state.shopping = false;
    state.cart = [];
    save();
    renderScan();
  };

  $("addProduct").onclick = () => {
    if (!state.shopping || state.finished) return;
    const p = cfg.products.find(p => p.id === $("productSelect").value);
    if (!p) return;
    const existing = state.cart.find(item => item.id === p.id);
    if (existing) existing.quantity++;
    else state.cart.push({ id: p.id, quantity: 1 });
    save();
    renderScan();
    if (p.discount > 0) toast("Rabatten har lagts till!");
  };

  function cartTotals() {
    let total = 0, discount = 0;
    state.cart.forEach(item => {
      const p = cfg.products.find(p => p.id === item.id);
      if (!p) return;
      total += (p.price - p.discount) * item.quantity;
      discount += p.discount * item.quantity;
    });
    return { total, discount };
  }

  function renderScan() {
    $("scanStatus").textContent = state.finished
      ? "Handlingen avslutad. Varukorgen är låst."
      : state.shopping
        ? "Handling pågår – testläge."
        : "Ingen aktiv handling.";

    $("startShopping").disabled = state.shopping || state.finished;
    $("cancelShopping").disabled = !state.shopping;
    $("addProduct").disabled = !state.shopping || state.finished;
    $("finishShopping").disabled =
      !state.shopping || state.cart.length === 0;

    $("cartLines").innerHTML = "";

    state.cart.forEach(item => {
      const p = cfg.products.find(p => p.id === item.id);
      if (!p) return;

      const line = document.createElement("div");
      line.className = "cart-line";
      const info = document.createElement("span");
      info.textContent =
        `${p.brand} ${p.name} – ${money(p.price - p.discount)} / st`;

      const controls = document.createElement("div");
      controls.className = "counter";

      const minus = document.createElement("button");
      minus.textContent = "−";
      const qty = document.createElement("strong");
      qty.textContent = item.quantity;
      const plus = document.createElement("button");
      plus.textContent = "+";

      minus.disabled = plus.disabled = state.finished;

      minus.onclick = () => changeQty(item.id, -1);
      plus.onclick = () => changeQty(item.id, 1);

      controls.append(minus, qty, plus);
      line.append(info, controls);
      $("cartLines").append(line);
    });

    if (!state.cart.length) $("cartLines").textContent =
      "Varukorgen är tom.";

    const totals = cartTotals();
    $("discountTotal").textContent =
      "Rabatt: " + money(totals.discount);
    $("cartTotal").textContent = "Totalt: " + money(totals.total);
    $("checkoutMessage").textContent = state.finished
      ? "Testkvitto: varukorgen har avslutats. Ingen betalning har gjorts."
      : "";
  }

  function changeQty(id, amount) {
    if (!state.shopping || state.finished) return;
    const item = state.cart.find(item => item.id === id);
    if (!item) return;
    item.quantity += amount;
    if (item.quantity <= 0)
      state.cart = state.cart.filter(item => item.id !== id);
    save();
    renderScan();
  }

  $("finishShopping").onclick = () => {
    if (!state.shopping || !state.cart.length) return;
    if (!confirm("Avsluta handlingen? Du kan inte ändra varukorgen efteråt."))
      return;
    state.shopping = false;
    state.finished = true;
    save();
    renderScan();
    toast("Handlingen avslutad. Detta är bara en demonstration.");
  };

  $("helpButton").onclick = () =>
    toast("Hjälpförfrågan visas endast i denna demo.");

  // PANTOMAT
  function pantTotal() {
    return cfg.pantTypes.reduce((sum, type) =>
      sum + (state.pant[type.id] || 0) * type.value, 0);
  }

  function renderPant() {
    $("pantCounters").innerHTML = "";

    cfg.pantTypes.forEach(type => {
      const line = document.createElement("div");
      line.className = "product";

      const label = document.createElement("span");
      label.textContent = `${type.name} (${money(type.value)} / st)`;

      const counter = document.createElement("div");
      counter.className = "counter";

      const minus = document.createElement("button");
      minus.textContent = "−";
      const amount = document.createElement("strong");
      amount.textContent = state.pant[type.id] || 0;
      const plus = document.createElement("button");
      plus.textContent = "+";

      minus.onclick = () => changePant(type.id, -1);
      plus.onclick = () => changePant(type.id, 1);

      counter.append(minus, amount, plus);
      line.append(label, counter);
      $("pantCounters").append(line);
    });

    $("pantAmount").textContent = money(pantTotal());
    $("pantBalance").textContent = money(state.pantBalance);
    $("pantHistory").innerHTML = state.pantHistory.length
      ? state.pantHistory.map(h =>
          `<div class="product"><span>${esc(h.date)} –
          ${esc(h.store)}</span><strong>+${money(h.amount)}</strong></div>`
        ).join("")
      : "<p>Ingen panthistorik ännu.</p>";
  }

  function changePant(id, delta) {
    state.pant[id] = Math.max(0, (state.pant[id] || 0) + delta);
    $("pantReview").hidden = true;
    save();
    renderPant();
  }

  $("reviewPant").onclick = () => {
    const total = pantTotal();
    if (!total) {
      toast("Lägg till minst en förpackning först.");
      return;
    }
    const count = Object.values(state.pant).reduce((a, b) => a + b, 0);
    $("pantSummary").textContent =
      `${count} förpackningar. Totalt ${money(total)}.`;
    $("pantReview").hidden = false;
  };

  $("confirmPant").onclick = () => {
    const total = pantTotal();
    if (!total || $("pantReview").hidden) return;

    state.pantBalance += total;
    state.pantHistory.unshift({
      date: new Date().toLocaleString("sv-SE"),
      store: state.store,
      amount: total
    });
    state.pant = {};
    save();

    $("pantReview").hidden = true;
    $("pantMessage").textContent =
      "Pantning klar! Pengarna har registrerats i demo-affärskontot.";
    renderPant();
    renderOverview();
    toast("Pantningen är klar!");
  };

  // BUTIKSINSTÄLLNINGAR
  $("saveStore").onclick = () => {
    const name = $("storeName").value.trim();
    if (!name) {
      toast("Ange ett butiksnamn.");
      return;
    }
    state.store = name;
    save();
    renderOverview();
    toast("Butiksnamnet har sparats.");
  };

  $("resetDemo").onclick = () => {
    if (!confirm("Återställa kartan, varukorgen och alla demouppgifter?"))
      return;
    localStorage.removeItem(KEY);
    state = JSON.parse(JSON.stringify(initial));
    selectedId = null;
    $("pantMessage").textContent = "";
    render();
    toast("Demouppgifterna har återställts.");
  };

  function render() {
    renderOverview();
    renderMap();
    renderScan();
    renderPant();
    $("storeName").value = state.store;
  }

  renderProductOptions();
  show("overview");
})();
