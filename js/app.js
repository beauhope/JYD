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

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

/* ===============================
   DOM READY
================================ */
document.addEventListener("DOMContentLoaded", () => {

  /* AUTH */
  document.getElementById("registerBtn")?.addEventListener("click", registerUser);
  document.getElementById("loginBtn")?.addEventListener("click", loginUser);

  const lockScreen = document.getElementById("lockScreen");
  const app = document.getElementById("app");

  /* TASK DOM */
  const titleInput = document.getElementById("taskTitle");
  const descInput = document.getElementById("taskDesc");
  const dueInput = document.getElementById("taskDue");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const clearFormBtn = document.getElementById("clearTaskBtn");
  const deleteDoneBtn = document.getElementById("deleteDone");
  const taskList = document.getElementById("taskList");

  const searchInput = document.getElementById("searchTask");
  const filterSelect = document.getElementById("filterTask");
  const sortSelect = document.getElementById("sortTask");

  const statusBtn = document.getElementById("connectionStatus");
statusBtn?.addEventListener("click", async () => {
  const confirmLogout = confirm("هل تريد تسجيل الخروج؟");

  if(confirmLogout){
    await auth.signOut();
    location.reload();
  }
});

  /* IDEA DOM */
  
  const ideaInput = document.getElementById("ideaInput");
const ideaDescInput = document.getElementById("ideaDesc");
const addIdeaBtn = document.getElementById("addIdeaBtn");
const ideaList = document.getElementById("ideaList");
const ideaPriority = document.getElementById("ideaPriority");
const ideaCount = document.getElementById("ideaCount");


  /* STATS */
  const totalCount = document.getElementById("totalCount");
  const doneCount = document.getElementById("doneCount");
  const todoCount = document.getElementById("todoCount");
  const overdueCount = document.getElementById("overdueCount");

  let allTasks = [];

/* =========================
   SCROLL TO TOP
========================= */
const scrollTopBtn = document.getElementById("scrollTopBtn");

function toggleScrollTop(){
  if (!scrollTopBtn) return;
  const y = window.scrollY || document.documentElement.scrollTop;
  scrollTopBtn.classList.toggle("show", y > 250);
}

window.addEventListener("scroll", toggleScrollTop, { passive: true });
toggleScrollTop();

scrollTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

  /* =========================
   ACCORDION SYSTEM
========================= */

const accordionHeaders = document.querySelectorAll(".section-header");

accordionHeaders.forEach(header => {

  header.addEventListener("click", () => {

    const parent = header.closest(".section-accordion");

    // إغلاق باقي الأقسام
    document.querySelectorAll(".section-accordion").forEach(section => {
      if (section !== parent) {
        section.classList.remove("active");
      }
    });

    // فتح/إغلاق الحالي
    parent.classList.toggle("active");

  });

});

  /* ===============================
     AUTH STATE
  ================================= */
  onAuthStateChanged(auth, (user) => {

    if (!user) {
      lockScreen.classList.remove("hidden");
      app.classList.add("hidden");
      return;
    }

    lockScreen.classList.add("hidden");
    app.classList.remove("hidden");

    const tasksRef = collection(db, "users", user.uid, "tasks");
    const ideasRef = collection(db, "users", user.uid, "ideas");
    const q = query(tasksRef, orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
      allTasks = [];

      snapshot.forEach(docSnap => {
        allTasks.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      renderTasks();
      updateStats();
    });

   const ideasQuery = query(ideasRef, orderBy("createdAt", "desc"));

onSnapshot(ideasQuery, (snapshot) => {

  ideaList.innerHTML = "";
  ideaCount.textContent = snapshot.size;

  snapshot.forEach(docSnap => {

    const idea = {
      id: docSnap.id,
      ...docSnap.data()
    };

    const createdDate = idea.createdAt?.toDate
      ? idea.createdAt.toDate().toLocaleString("ar-MA")
      : "الآن";

    let priorityClass = "priority-low";
    let priorityText = "منخفضة";

    if (idea.priority === "high") {
      priorityClass = "priority-high";
      priorityText = "عالية";
    } else if (idea.priority === "medium") {
      priorityClass = "priority-medium";
      priorityText = "متوسطة";
    }

    const li = document.createElement("li");
    li.classList.add("fade-in");

    li.innerHTML = `
      <div class="task-card">

        <div class="task-header">
          <h3>${idea.title}</h3>
          <span class="priority-badge ${priorityClass}">
            ${priorityText}
          </span>
        </div>

        <div class="task-body">
          <p>${idea.desc || "بدون تفاصيل"}</p>
        </div>

        <div class="task-footer">
          <div class="task-info">
            <span>تمت الإضافة:</span>
            <strong>${createdDate}</strong>
          </div>

          <div class="task-actions">

            <button class="btn-primary small convert-task">
              🎯 تحويل لمهمة
            </button>

            <button class="btn-gold small convert-project">
              💾 تحويل لمشروع
            </button>

            <button class="btn-danger small delete-idea">
              حذف 🗑
            </button>

          </div>
        </div>

      </div>
    `;

    /* حذف */
    li.querySelector(".delete-idea").addEventListener("click", async () => {
      await deleteDoc(
        doc(db, "users", auth.currentUser.uid, "ideas", idea.id)
      );
    });

    /* تحويل إلى مهمة */
    li.querySelector(".convert-task").addEventListener("click", async () => {

      await addDoc(
        collection(db, "users", auth.currentUser.uid, "tasks"),
        {
          title: idea.title,
          desc: idea.desc || "",
          done: false,
          createdAt: serverTimestamp()
        }
      );

      await deleteDoc(
        doc(db, "users", auth.currentUser.uid, "ideas", idea.id)
      );
    });

    /* تحويل إلى مشروع (مستقبلي) */
    li.querySelector(".convert-project").addEventListener("click", () => {
      alert("سيتم تطوير قسم المشاريع لاحقًا 🚀");
    });

    ideaList.appendChild(li);

  });

});


  });

  /* ===============================
     ADD TASK
  ================================= */
  addTaskBtn?.addEventListener("click", async () => {

    const user = auth.currentUser;
    if (!user) return;

    const title = titleInput.value.trim();
    if (!title) return alert("اكتب عنوان المهمة");

    await addDoc(collection(db, "users", user.uid, "tasks"), {
      title,
      desc: descInput.value || "",
      due: dueInput.value ? new Date(dueInput.value).toISOString() : null,
      done: false,
      createdAt: serverTimestamp()
    });

    titleInput.value = "";
    descInput.value = "";
    dueInput.value = "";
  });

  clearFormBtn?.addEventListener("click", () => {
    titleInput.value = "";
    descInput.value = "";
    dueInput.value = "";
  });

  deleteDoneBtn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    const doneTasks = allTasks.filter(t => t.done);
    for (const t of doneTasks) {
      await deleteDoc(doc(db, "users", user.uid, "tasks", t.id));
    }
  });

  /* ===============================
     ADD IDEA
  ================================= */
  addIdeaBtn?.addEventListener("click", async () => {

  const user = auth.currentUser;
  if (!user) return;

  const title = ideaInput.value.trim();
  if (!title) return;

  await addDoc(collection(db, "users", user.uid, "ideas"), {
    title,
    desc: ideaDescInput.value || "",
    priority: ideaPriority.value,
    createdAt: serverTimestamp()
  });

  ideaInput.value = "";
  ideaDescInput.value = "";
});



  /* ===============================
     FILTER / SEARCH / SORT
  ================================= */
  searchInput?.addEventListener("input", renderTasks);
  filterSelect?.addEventListener("change", renderTasks);
  sortSelect?.addEventListener("change", renderTasks);

  /* ===============================
     HELPERS
  ================================= */
  function isOverdue(task) {
    if (!task.due || task.done) return false;
    return new Date(task.due) < new Date();
  }

  function updateStats() {
    const done = allTasks.filter(t => t.done).length;
    const overdue = allTasks.filter(t => isOverdue(t)).length;
    const todo = allTasks.length - done - overdue;

    totalCount.textContent = allTasks.length;
    doneCount.textContent = done;
    todoCount.textContent = todo;
    overdueCount.textContent = overdue;
  }

  function renderTasks() {

    let tasks = [...allTasks];

    const search = searchInput.value.toLowerCase();
    if (search) {
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(search)
      );
    }

    const filter = filterSelect.value;
    if (filter === "done") tasks = tasks.filter(t => t.done);
    if (filter === "todo") tasks = tasks.filter(t => !t.done && !isOverdue(t));
    if (filter === "overdue") tasks = tasks.filter(t => isOverdue(t));

    const sort = sortSelect.value;
    if (sort === "dueAsc") tasks.sort((a,b)=>new Date(a.due||0)-new Date(b.due||0));
    if (sort === "dueDesc") tasks.sort((a,b)=>new Date(b.due||0)-new Date(a.due||0));

    taskList.innerHTML = "";

    tasks.forEach(task => {

      const li = document.createElement("li");

      const overdue = isOverdue(task);

      let statusText = "مطلوبة";
      let statusColor = "#fbbf24";

      if (task.done) {
        statusText = "منجزة";
        statusColor = "#22c55e";
      } else if (overdue) {
        statusText = "متأخرة";
        statusColor = "#ef4444";
      }

      li.innerHTML = `
        <div class="task-card">

          <div class="task-header">
            <h3>${task.title}</h3>
          </div>

          <div class="task-body">
            <p>${task.desc || "بدون تفاصيل"}</p>
          </div>

          <div class="task-footer">
            <div class="task-info">
              <span>الحالة:</span>
              <strong style="color:${statusColor}">
                ${statusText}
              </strong>

              <span class="task-due">
                — الموعد:
                ${task.due
                  ? new Date(task.due).toLocaleString("ar-MA")
                  : "بدون موعد"}
              </span>
            </div>

            <div class="task-actions">

              <button class="btn-primary small done-btn">
                ${task.done ? "إلغاء" : "إنجاز"}
              </button>

              <button class="btn-gold small edit-btn">
                تعديل ✏️
              </button>

              <button class="btn-danger small delete-btn">
                حذف 🗑
              </button>

            </div>
          </div>

        </div>
      `;

      // إنجاز
      li.querySelector(".done-btn").addEventListener("click", async () => {
        const user = auth.currentUser;
        await updateDoc(doc(db, "users", user.uid, "tasks", task.id), {
          done: !task.done
        });
      });

      // حذف
      li.querySelector(".delete-btn").addEventListener("click", async () => {
        const user = auth.currentUser;
        await deleteDoc(doc(db, "users", user.uid, "tasks", task.id));
      });

      // تعديل
      li.querySelector(".edit-btn").addEventListener("click", async () => {
        titleInput.value = task.title;
        descInput.value = task.desc || "";
        dueInput.value = task.due
          ? new Date(task.due).toISOString().slice(0,16)
          : "";

        await deleteDoc(doc(db, "users", auth.currentUser.uid, "tasks", task.id));
      });

      taskList.appendChild(li);

    });
  }

});



/* ===================================
   PWA REGISTER (GitHub Pages Production)
=================================== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      console.log("Service Worker Registered");

      // Detect update
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;

        newWorker?.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateUI(reg);
          }
        });
      });

    } catch (err) {
      console.error("SW error:", err);
    }
  });
}


/* =========================
   Update UI
========================= */
function showUpdateUI(registration) {
  const updateBar = document.createElement("div");

  updateBar.innerHTML = `
    <div style="
      position:fixed;
      bottom:18px;
      left:50%;
      transform:translateX(-50%);
      background:#0f1935;
      padding:12px 18px;
      border-radius:14px;
      border:1px solid rgba(198,167,74,.45);
      box-shadow:0 12px 26px rgba(0,0,0,.55);
      z-index:9999;
      display:flex;
      gap:10px;
      align-items:center;
      font-size:14px;
    ">
      نسخة جديدة متاحة 🚀
      <button id="updateNowBtn"
        style="
          background:#c6a74a;
          color:#0a1124;
          border:none;
          padding:6px 12px;
          border-radius:10px;
          cursor:pointer;
          font-weight:600;
        ">
        تحديث الآن
      </button>
    </div>
  `;

  document.body.appendChild(updateBar);

  document.getElementById("updateNowBtn").addEventListener("click", () => {
    registration.waiting?.postMessage("SKIP_WAITING");
  });
}


/* =========================
   Reload After Activate
========================= */
navigator.serviceWorker?.addEventListener("controllerchange", () => {
  window.location.reload();
});






