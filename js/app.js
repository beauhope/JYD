// js/app.js

import { auth, db } from "./firebase.js";
import { registerUser, loginUser } from "./auth.js";

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc
  
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
 
  /* ===============================
     AUTH BUTTONS
  =============================== */
  document.getElementById("registerBtn")?.addEventListener("click", registerUser);
  document.getElementById("loginBtn")?.addEventListener("click", loginUser);

  const lockScreen = document.getElementById("lockScreen");
  const app = document.getElementById("app");
/* ===============================
   CONNECTION STATUS (LOGOUT)
=============================== */
const statusBtn = document.getElementById("connectionStatus");

statusBtn?.addEventListener("click", async (e) => {
  e.preventDefault();

  const confirmLogout = confirm("هل تريد تسجيل الخروج؟");
  if (!confirmLogout) return;

  try {
    stopReminderScheduler();
    await auth.signOut();
    // لا داعي ل reload غالباً لأن onAuthStateChanged سيُحدّث الواجهة
    // لكن نتركه لضمان التحديث على كل الأجهزة:
    location.reload();
  } catch (err) {
    console.error("Logout error:", err);
    alert("حدث خطأ أثناء تسجيل الخروج");
  }
});

  /* ===============================
     TASK DOM
  =============================== */
  const titleInput = document.getElementById("taskTitle");
  const descInput = document.getElementById("taskDesc");
    /* ===============================
     LIMIT INPUT LENGTH
  =============================== */
  const TITLE_MAX = 80;   // عدّل الرقم كما تريد
  const DESC_MAX  = 1000;  // عدّل الرقم كما تريد

  // enforce maxLength on inputs
  if (titleInput) titleInput.maxLength = TITLE_MAX;
  if (descInput)  descInput.maxLength  = DESC_MAX;

  // (اختياري) منع لصق نص طويل
  titleInput?.addEventListener("input", () => {
    if (titleInput.value.length > TITLE_MAX) {
      titleInput.value = titleInput.value.slice(0, TITLE_MAX);
    }
  });

  descInput?.addEventListener("input", () => {
    if (descInput.value.length > DESC_MAX) {
      descInput.value = descInput.value.slice(0, DESC_MAX);
    }
  });
/* ===============================
     end LIMIT INPUT LENGTH
  =============================== */
  const dueInput = document.getElementById("taskDue");
  const taskTypeSelect = document.getElementById("taskType");

  const addTaskBtn = document.getElementById("addTaskBtn");
  const clearFormBtn = document.getElementById("clearTaskBtn");
  const deleteDoneBtn = document.getElementById("deleteDone");
  const taskList = document.getElementById("taskList");

  const searchInput = document.getElementById("searchTask");
  const filterSelect = document.getElementById("filterTask");
  const typeFilter = document.getElementById("typeFilter");
  const sortSelect = document.getElementById("sortTask");

  const totalCount = document.getElementById("totalCount");
  const doneCount = document.getElementById("doneCount");
  const todoCount = document.getElementById("todoCount");
  const overdueCount = document.getElementById("overdueCount");



  
    /* ===============================
     PLANNER DOM
  =============================== */
  const plannerBody = document.getElementById("plannerBody");
  const plannerCount = document.getElementById("plannerCount");

/* ===============================
   PLANNER -> JUMP TO TASK (Option A)
=============================== */
function openAccordionFor(el) {
  const section = el?.closest?.(".section-accordion");
  if (!section) return;

  // close others (نفس منطقك)
  document.querySelectorAll(".section-accordion").forEach(s => {
    if (s !== section) {
      s.classList.remove("active");
      const c = s.querySelector(".section-content");
      if (c) c.style.maxHeight = "0px";
    }
  });

  section.classList.add("active");
  const content = section.querySelector(".section-content");
  if (content) content.style.maxHeight = content.scrollHeight + "px";
}

function resetTasksViewFilters() {
  if (searchInput) searchInput.value = "";
  if (filterSelect) filterSelect.value = "all";
  if (typeFilter) typeFilter.value = "all";
  // sort لا يخفي المهام، خلّيه كما هو (أو رجّعه newset لو تحب)
  // if (sortSelect) sortSelect.value = "newest";
}

function jumpToTask(taskId) {
  if (!taskList || !taskId) return;

  // افتح أكورديون "عرض المهام"
  openAccordionFor(taskList);

  // صفّر البحث/الفلاتر حتى لا تكون المهمة مخفية
  resetTasksViewFilters();
  renderTasks();

  // بعد إعادة الرسم، ابحث عن المهمة
  const li = taskList.querySelector(`li[data-id="${CSS.escape(taskId)}"]`);
  if (!li) {
    alert("المهمة موجودة لكن قد تكون مخفية بسبب فلتر/ترتيب.");
    return;
  }

  // Scroll + Highlight
  li.scrollIntoView({ behavior: "smooth", block: "center" });
  li.classList.add("jump-highlight");
  setTimeout(() => li.classList.remove("jump-highlight"), 1400);
}

// Event delegation على بلانر
plannerBody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".planner-link");
  if (!btn) return;
  const id = btn.getAttribute("data-jump");
  jumpToTask(id);
});

  /* ===============================
     IDEA DOM
  =============================== */
  const ideaInput = document.getElementById("ideaInput");
  const ideaDescInput = document.getElementById("ideaDesc");
  const ideaPriority = document.getElementById("ideaPriority");
  const ideaTypeSelect = document.getElementById("ideaType");
  const ideaTypeFilter = document.getElementById("ideaTypeFilter"); // مهم: لازم يكون موجود في HTML
  const addIdeaBtn = document.getElementById("addIdeaBtn");
  const ideaList = document.getElementById("ideaList");
  const ideaCount = document.getElementById("ideaCount");

  let allTasks = [];
  let allIdeas = [];

  /* ===============================
     ACCORDION (MOBILE-SAFE)
     - Event Delegation
     - Height animation using scrollHeight
  =============================== */
  document.addEventListener("click", (e) => {
    const header = e.target.closest(".section-header");
    if (!header) return;

    const parent = header.closest(".section-accordion");
    if (!parent) return;

    // close others
    document.querySelectorAll(".section-accordion").forEach(section => {
      if (section !== parent) {
        section.classList.remove("active");
        const c = section.querySelector(".section-content");
        if (c) c.style.maxHeight = "0px";
      }
    });

    // toggle current
    const content = parent.querySelector(".section-content");
    const willOpen = !parent.classList.contains("active");

    parent.classList.toggle("active");

    if (content) {
      if (willOpen) {
        content.style.maxHeight = content.scrollHeight + "px";
      } else {
        content.style.maxHeight = "0px";
      }
    }
  }, { passive: true });

  // لو كان عندك Accordion مفتوح افتراضيًا
  document.querySelectorAll(".section-accordion.active .section-content").forEach(c => {
    c.style.maxHeight = c.scrollHeight + "px";
  });
  /* ===============================
     SCROLL TO TOP BUTTON
  =============================== */
  const scrollTopBtn = document.getElementById("scrollTopBtn");

  function toggleScrollTop() {
    if (!scrollTopBtn) return;
    if (window.scrollY > 250) scrollTopBtn.classList.add("show");
    else scrollTopBtn.classList.remove("show");
  }

  // show/hide on scroll
  window.addEventListener("scroll", toggleScrollTop, { passive: true });
  // initial state
  toggleScrollTop();

  // click -> scroll to top
  scrollTopBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ===============================
     AUTH STATE
  =============================== */
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      lockScreen?.classList.remove("hidden");
      app?.classList.add("hidden");
      return;
    }

    lockScreen?.classList.add("hidden");
    app?.classList.remove("hidden");

    /* ===============================
       LOAD TASKS
    =============================== */
    const tasksRef = collection(db, "users", user.uid, "tasks");
    const tasksQuery = query(tasksRef, orderBy("createdAt", "desc"));

    onSnapshot(tasksQuery, (snapshot) => {
      allTasks = [];
      snapshot.forEach(docSnap => {
        allTasks.push({ id: docSnap.id, ...docSnap.data() });
      });

      renderTasks();
      renderPlanner();
      updateStats();
      startReminderScheduler();
    });

    /* ===============================
       LOAD IDEAS
    =============================== */
    const ideasRef = collection(db, "users", user.uid, "ideas");
    const ideasQuery = query(ideasRef, orderBy("createdAt", "desc"));

    onSnapshot(ideasQuery, (snapshot) => {
      allIdeas = [];
      snapshot.forEach(docSnap => {
        allIdeas.push({ id: docSnap.id, ...docSnap.data() });
      });

      renderIdeas();
    });
  });

  /* ===============================
     ADD TASK
  =============================== */
  addTaskBtn?.addEventListener("click", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const title = titleInput?.value.trim();
    if (!title) return alert("اكتب عنوان المهمة");
    if (title.length > TITLE_MAX) {
      return alert(`عنوان المهمة يجب ألا يتجاوز ${TITLE_MAX} حرفًا`);
    }

    const descVal = (descInput?.value || "");
    if (descVal.length > DESC_MAX) {
      return alert(`تفاصيل المهمة يجب ألا تتجاوز ${DESC_MAX} حرفًا`);
    }

    await addDoc(collection(db, "users", user.uid, "tasks"), {
      title,
      desc: descInput?.value || "",
      due: dueInput?.value ? new Date(dueInput.value).toISOString() : null,
      done: false,
      type: taskTypeSelect?.value || "personal",
      createdAt: serverTimestamp()
    });

    if (titleInput) titleInput.value = "";
    if (descInput) descInput.value = "";
    if (dueInput) dueInput.value = "";
  });

  clearFormBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (titleInput) titleInput.value = "";
    if (descInput) descInput.value = "";
    if (dueInput) dueInput.value = "";
  });

  deleteDoneBtn?.addEventListener("click", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return;

  const doneTasks = allTasks.filter(t => t.done);

  if (doneTasks.length === 0) {
    alert("لا توجد مهام منجزة للحذف.");
    return;
  }

  const ok = confirm(
    `تأكيد الحذف:\nسيتم حذف ${doneTasks.length} مهمة منجزة نهائيًا.\n\nاضغط "موافق" لتأكيد الحذف.`
  );
  if (!ok) return;

  for (const t of doneTasks) {
    await deleteDoc(doc(db, "users", user.uid, "tasks", t.id));
  }
});

  /* ===============================
     ADD IDEA
  =============================== */
  addIdeaBtn?.addEventListener("click", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const title = ideaInput?.value.trim();
    if (!title) return alert("اكتب عنوان الفكرة");

    await addDoc(collection(db, "users", user.uid, "ideas"), {
      title,
      desc: ideaDescInput?.value || "",
      priority: ideaPriority?.value || "low",
      type: ideaTypeSelect?.value || "personal",
      createdAt: serverTimestamp()
    });

    if (ideaInput) ideaInput.value = "";
    if (ideaDescInput) ideaDescInput.value = "";
  });

  /* ===============================
     FILTER EVENTS
  =============================== */
  searchInput?.addEventListener("input", renderTasks);
  filterSelect?.addEventListener("change", renderTasks);
  sortSelect?.addEventListener("change", renderTasks);
  typeFilter?.addEventListener("change", renderTasks);

  ideaTypeFilter?.addEventListener("change", renderIdeas);

  /* ===============================
     EVENT DELEGATION: TASK ACTIONS
     (Mobile safe)
  =============================== */
  taskList?.addEventListener("click", async (e) => {
    const user = auth.currentUser;
    if (!user) return;

    const btn = e.target.closest("button");
    if (!btn) return;

    const li = e.target.closest("li");
    const taskId = li?.dataset?.id;
    if (!taskId) return;

    if (btn.classList.contains("done-btn")) {
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
        done: !task.done
      });
      return;
    }

    if (btn.classList.contains("delete-btn")) {

  const task = allTasks.find(t => t.id === taskId);
  const title = task?.title ? task.title : "هذه المهمة";

  const ok = confirm(`تأكيد الحذف:\nسيتم حذف المهمة التالية نهائيًا:\n\n"${title}"\n\nاضغط "موافق" لتأكيد الحذف.`);
  if (!ok) return;

  await deleteDoc(doc(db, "users", user.uid, "tasks", taskId));
  return;
}

    if (btn.classList.contains("edit-btn")) {
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      if (titleInput) titleInput.value = task.title || "";
      if (descInput) descInput.value = task.desc || "";
      if (dueInput) {
        dueInput.value = task.due
          ? new Date(task.due).toISOString().slice(0, 16)
          : "";
      }
      if (taskTypeSelect) taskTypeSelect.value = task.type || "personal";

      // نفس سلوكك السابق: حذف القديم بعد تعبئة الحقول
      await deleteDoc(doc(db, "users", user.uid, "tasks", taskId));
      return;
    }
  });

  /* ===============================
     EVENT DELEGATION: IDEA ACTIONS
     - delete
     - convert to task
     - convert project placeholder
  =============================== */
  ideaList?.addEventListener("click", async (e) => {
    const user = auth.currentUser;
    if (!user) return;

    const btn = e.target.closest("button");
    if (!btn) return;

    const li = e.target.closest("li");
    const ideaId = li?.dataset?.id;
    if (!ideaId) return;

    const idea = allIdeas.find(i => i.id === ideaId);
    if (!idea) return;

    if (btn.classList.contains("idea-delete")) {

  const title = idea?.title ? idea.title : "هذه الفكرة";

  const ok = confirm(`تأكيد الحذف:\nسيتم حذف الفكرة التالية نهائيًا:\n\n"${title}"\n\nاضغط "موافق" لتأكيد الحذف.`);
  if (!ok) return;

  await deleteDoc(doc(db, "users", user.uid, "ideas", ideaId));
  return;
}

    if (btn.classList.contains("idea-to-task")) {
      await addDoc(collection(db, "users", user.uid, "tasks"), {
        title: idea.title || "",
        desc: idea.desc || "",
        due: null,
        done: false,
        type: idea.type || "personal",
        createdAt: serverTimestamp()
      });

      await deleteDoc(doc(db, "users", user.uid, "ideas", ideaId));
      return;
    }

    if (btn.classList.contains("idea-to-project")) {
      alert("سيتم تطوير قسم المشاريع لاحقًا 🚀");
      return;
    }
  });

  /* ===============================
     HELPERS
  =============================== */
  // تحويل Firestore Timestamp أو ISO string إلى Date
  function toDateSafe(value) {
    if (!value) return null;

    // Firestore Timestamp
    if (typeof value === "object" && typeof value.toDate === "function") {
      try { return value.toDate(); } catch { return null; }
    }

    // ISO string or anything Date can parse
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // تنسيق تاريخ/وقت بالعربية
  function formatDateTime(value) {
    const d = toDateSafe(value);
    if (!d) return "—";

    return d.toLocaleString("ar", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }


  function isOverdue(task) {
    if (!task?.due || task?.done) return false;
    return new Date(task.due) < new Date();
  }

/* ===============================
   REMINDERS (In-App + Web Notification while app is open)
   يعتمد على task.due (ISO)
=============================== */
const REMINDER_CHECK_EVERY_MS = 30 * 1000; // فحص كل 30 ثانية
const REMINDER_WINDOW_MS = 60 * 1000;      // نافذة دقيقة لتجنب تفويت التنبيه

let reminderTimer = null;

function dueMs(task) {
  const d = toDateSafe(task?.due);
  return d ? d.getTime() : NaN;
}

function notifiedKey(taskId, whenMs) {
  return `reminded_${taskId}_${whenMs}`;
}

function wasReminded(taskId, whenMs) {
  try { return localStorage.getItem(notifiedKey(taskId, whenMs)) === "1"; }
  catch { return false; }
}

function markReminded(taskId, whenMs) {
  try { localStorage.setItem(notifiedKey(taskId, whenMs), "1"); }
  catch {}
}

async function requestNotifyPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  // الأفضل طلب الإذن عبر زر (تفاعل المستخدم)، لكن نضعها هنا للاحتياط
  const p = await Notification.requestPermission();
  return p === "granted";
}

function showInAppReminder(task) {
  // بسيط وواضح. إذا تحب لاحقًا نحوله لمودال جميل بدل alert
  alert(`⏰ حان وقت تنفيذ المهمة:\n\n${task.title || ""}`);
}

function showWebReminder(task) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new Notification("⏰ تذكير مهمة", {
    body: task.title || "لديك مهمة حان وقتها",
    // icon: "/JYD/icons/icon-192.png",
    // tag يساعد على تقليل التكرار في بعض المتصفحات
    tag: `task_${task.id}`
  });
}

async function checkRemindersNow() {
  const now = Date.now();

  for (const task of allTasks) {
    if (!task?.due) continue;
    if (task.done) continue;

    const whenMs = dueMs(task);
    if (!Number.isFinite(whenMs)) continue;

    const diff = whenMs - now;

    // يعتبر "وصل الوقت" إذا دخلنا خلال دقيقة بعد وقت التنفيذ
    const isDueNow = diff <= 0 && diff >= -REMINDER_WINDOW_MS;

    if (isDueNow && !wasReminded(task.id, whenMs)) {
      markReminded(task.id, whenMs);

      // تنبيه داخل التطبيق
      showInAppReminder(task);

      // إشعار متصفح (اختياري) — لن يظهر إلا إذا المستخدم منح الإذن
      await requestNotifyPermission();
      showWebReminder(task);
    }
  }
}

function startReminderScheduler() {
  if (reminderTimer) clearInterval(reminderTimer);

  // فحص مباشر عند تشغيل الجدولة
  checkRemindersNow();

  reminderTimer = setInterval(checkRemindersNow, REMINDER_CHECK_EVERY_MS);
}

function stopReminderScheduler() {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = null;
}


  function updateStats() {
    const done = allTasks.filter(t => t.done).length;
    const overdue = allTasks.filter(t => isOverdue(t)).length;
    const todo = allTasks.length - done - overdue;

    if (totalCount) totalCount.textContent = allTasks.length;
    if (doneCount) doneCount.textContent = done;
    if (todoCount) todoCount.textContent = todo;
    if (overdueCount) overdueCount.textContent = overdue;
  }

  /* ===============================
     RENDER TASKS
  =============================== */
  function renderTasks() {
    if (!taskList) return;

    let tasks = [...allTasks];

    const search = (searchInput?.value || "").toLowerCase();
    if (search) {
      tasks = tasks.filter(t => (t.title || "").toLowerCase().includes(search));
    }

    const filter = filterSelect?.value || "all";
    if (filter === "done") tasks = tasks.filter(t => t.done);
    if (filter === "todo") tasks = tasks.filter(t => !t.done && !isOverdue(t));
    if (filter === "overdue") tasks = tasks.filter(t => isOverdue(t));

    const typeValue = typeFilter?.value || "all";
    if (typeValue !== "all") tasks = tasks.filter(t => (t.type || "personal") === typeValue);

    const sort = sortSelect?.value || "newest";

// === PATCH: SORTING (keep done always last) ===
// 1) طبق فرز الاختيار (بدون الخلط مع done)
if (sort === "oldest") {
  tasks.sort((a, b) => {
    const da = toDateSafe(a.createdAt)?.getTime() || 0;
    const db = toDateSafe(b.createdAt)?.getTime() || 0;
    return da - db;
  });
}

if (sort === "dueAsc") {
  tasks.sort((a, b) => new Date(a.due || 0) - new Date(b.due || 0));
}

if (sort === "dueDesc") {
  tasks.sort((a, b) => new Date(b.due || 0) - new Date(a.due || 0));
}

// 2) خطوة ثابتة في النهاية: غير المنجزة أولاً، والمنجزة دائماً آخر القائمة
tasks.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
// === END PATCH ===


    taskList.innerHTML = "";

    tasks.forEach(task => {
      const li = document.createElement("li");
      li.dataset.id = task.id;
      // === PATCH: mark done li ===
  if (task.done) li.classList.add("is-done");
  // === END PATCH ===

      li.innerHTML = `
        <div class="task-card ${task.done ? "is-done" : ""}">

          <div class="task-header">
            <h3>
              ${task.title || ""}
              <span class="type-badge ${task.type || "personal"}">
                ${task.type === "work" ? "عمل" : "شخصي"}
              </span>
            </h3>
          </div>

             <div class="task-body">
            <p>${task.desc || "بدون تفاصيل"}</p>

            <p class="task-info" style="margin:8px 0 0 0; color: var(--muted);">
              📅 الاستحقاق:
              <b>${task.due ? formatDateTime(task.due) : "غير محدد"}</b>
            </p>
          </div>


          <div class="task-footer">
            <div class="task-actions">
              <button type="button" class="btn-primary small done-btn">
                ${task.done ? "إلغاء" : "إنجاز"} ✅
              </button>

              <button type="button" class="btn-gold small edit-btn">
                تعديل ✏️
              </button>

              <button type="button" class="btn-danger small delete-btn">
                حذف 🗑
              </button>
            </div>
          </div>

        </div>
      `;

      taskList.appendChild(li);
    });
  }

  /* ===============================
     PLANNER: MOBILE SHORT LABELS
  =============================== */
  const isMobilePlanner = window.matchMedia("(max-width: 768px)").matches;

  const shortType = (t) => {
    if (!isMobilePlanner) return (t === "work" ? "عمل" : "شخصي");
    return (t === "work" ? "ع" : "ش");
  };

  const shortStatus = (s) => {
    // s: "done" | "overdue" | "todo"
    if (!isMobilePlanner) {
      if (s === "done") return "منجزة";
      if (s === "overdue") return "متأخرة";
      return "مطلوبة";
    }
    if (s === "done") return "✓";
    if (s === "overdue") return "مت";
    return "م";
  };




    /* ===============================
     RENDER PLANNER (Scheduled Tasks Table)
  =============================== */
  function renderPlanner() {
    if (!plannerBody || !plannerCount) return;

    // فقط المهام التي لها due
    const scheduled = allTasks
  .filter(t => !!t.due)
  .map(t => ({
    ...t,
    _dueDate: toDateSafe(t.due)
  }))
  .filter(t => t._dueDate)
  .sort((a, b) => {
    const rank = (t) => {
      if (t.done) return 2;          // done last
      if (isOverdue(t)) return 0;    // overdue first
      return 1;                      // todo middle
    };

    const ra = rank(a);
    const rb = rank(b);

    if (ra !== rb) return ra - rb;

    // داخل نفس المجموعة:
    if (ra === 2) {
      // done: الأحدث أولاً
      return b._dueDate - a._dueDate;
    }

    // overdue + todo: الأقدم أولاً
    return a._dueDate - b._dueDate;
  });

    plannerCount.textContent = String(scheduled.length);
    plannerBody.innerHTML = "";

    if (scheduled.length === 0) {
      plannerBody.innerHTML = `
        <tr>
          <td colspan="4" style="color:var(--muted); padding:14px; text-align:center;">
            لا توجد مهام مجدولة بتاريخ/وقت حتى الآن.
          </td>
        </tr>
      `;
      return;
    }

    scheduled.forEach(task => {
      const d = task._dueDate;

      const dateStr = d.toLocaleDateString("ar", {
        year: "numeric", month: "2-digit", day: "2-digit"
      });

      const timeStr = d.toLocaleTimeString("ar", {
        hour: "2-digit", minute: "2-digit"
      });

      const typeLabel = shortType(task.type);

      const statusKey = task.done ? "done" : (isOverdue(task) ? "overdue" : "todo");
      const statusLabel = shortStatus(statusKey);


      const tr = document.createElement("tr");
      tr.className = `planner-row ${task.done ? "is-done" : ""} ${isOverdue(task) ? "is-overdue" : ""}`;

      tr.innerHTML = `
  <td class="planner-when">
    <div class="planner-date">${dateStr}</div>
    <div class="planner-time">${timeStr}</div>
  </td>

  <td>
    <button type="button"
            class="planner-link planner-title"
            data-jump="${task.id}">
      ${task.title || ""}
    </button>
  </td>

  <td>
    <span class="planner-type ${task.type || "personal"}">${typeLabel}</span>
  </td>

  <td>
    <span class="planner-status ${task.done ? "done" : (isOverdue(task) ? "overdue" : "todo")}">
      ${statusLabel}
    </span>
  </td>
`;



      plannerBody.appendChild(tr);
    });
  }

  /* ===============================
     RENDER IDEAS (WITH FILTER + ACTION BUTTONS)
  =============================== */
  function renderIdeas() {
    if (!ideaList || !ideaCount) return;

    let ideas = [...allIdeas];

    const filterValue = ideaTypeFilter?.value || "all";
    if (filterValue !== "all") {
      ideas = ideas.filter(i => (i.type || "personal") === filterValue);
    }

    ideaList.innerHTML = "";
    ideaCount.textContent = String(ideas.length);

    ideas.forEach(idea => {
      const li = document.createElement("li");
      li.dataset.id = idea.id;

      // priority badge (اختياري/حلو)
      let pClass = "priority-low";
      let pText = "منخفضة";
      if (idea.priority === "high") { pClass = "priority-high"; pText = "عالية"; }
      else if (idea.priority === "medium") { pClass = "priority-medium"; pText = "متوسطة"; }

      li.innerHTML = `
        <div class="task-card">

          <div class="task-header">
            <h3>
              ${idea.title || ""}
              <span class="type-badge ${idea.type || "personal"}">
                ${idea.type === "work" ? "عمل" : "شخصي"}
              </span>
            </h3>

            <span class="priority-badge ${pClass}">
              ${pText}
            </span>
          </div>

                   <div class="task-body">
            <p>${idea.desc || "بدون تفاصيل"}</p>

            <p class="task-info" style="margin:8px 0 0 0; color: var(--muted);">
              🕒 تاريخ الكتابة: <b>${formatDateTime(idea.createdAt)}</b>
            </p>
          </div>


          <div class="task-footer">
            <div class="task-actions">
              <button type="button" class="btn-primary small idea-to-task">
                🎯 تحويل لمهمة
              </button>

              <button type="button" class="btn-gold small idea-to-project">
                💾 تحويل لمشروع
              </button>

              <button type="button" class="btn-danger small idea-delete">
                حذف 🗑
              </button>
            </div>
          </div>

        </div>
      `;

      ideaList.appendChild(li);
    });
  }

});
