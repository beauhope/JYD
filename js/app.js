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
      updateStats();
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
    if (sort === "dueAsc") tasks.sort((a, b) => new Date(a.due || 0) - new Date(b.due || 0));
    if (sort === "dueDesc") tasks.sort((a, b) => new Date(b.due || 0) - new Date(a.due || 0));

    taskList.innerHTML = "";

    tasks.forEach(task => {
      const li = document.createElement("li");
      li.dataset.id = task.id;

      li.innerHTML = `
        <div class="task-card">

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
