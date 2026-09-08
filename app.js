let usuario = null;

const $ = id => document.getElementById(id);

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Erro");

  return data;
}

async function login() {
  try {
    usuario = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: $("email").value,
        senha: $("senha").value,
        perfil: $("perfil").value
      })
    });

    $("login").hidden = true;
    $("app").hidden = false;

    $("usuario").textContent =
      `${usuario.nome} • ${usuario.perfil}`;

    $("medicoBtn").hidden = usuario.perfil !== "doctor";
    $("adminBtn").hidden = usuario.perfil !== "admin";

    atualizar();

  } catch (e) {
    $("loginMsg").textContent = e.message;
  }
}

function logout() {
  usuario = null;

  $("app").hidden = true;
  $("login").hidden = false;

  $("email").value = "";
  $("senha").value = "";
}

function pagina(nome) {
  document.querySelectorAll(".page")
    .forEach(p => p.classList.remove("active"));

  $(nome).classList.add("active");

  const nomes = {
    home: "Dashboard",
    consultas: "Consultas",
    ia: "IA Clinical",
    medico: "Agenda Médica",
    admin: "Administração"
  };

  $("titulo").textContent = nomes[nome] || nome;

  atualizar();
}

async function atualizar() {
  if (!usuario) return;

  const consultas = await api(
    `/api/consultas?email=${encodeURIComponent(usuario.email)}`
  );

  $("totalConsultas").textContent = consultas.length;

  if (consultas.length) {
    const proxima = [...consultas]
      .sort((a, b) =>
        `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`)
      )[0];

    $("proxima").textContent =
      `${proxima.data} ${proxima.hora}`;
  }

  $("listaConsultas").innerHTML = consultas.length
    ? consultas.map(c => `
      <div class="card">
        <b>${c.especialidade}</b>
        <br>
        ${c.data} às ${c.hora}
      </div>
    `).join("")
    : "<p>Nenhuma consulta encontrada.</p>";

  if (usuario.perfil === "doctor")
    carregarAgenda();

  if (usuario.perfil === "admin")
    carregarUsuarios();
}

async function agendar() {
  try {
    await api("/api/consultas", {
      method: "POST",
      body: JSON.stringify({
        paciente: usuario.nome,
        email: usuario.email,
        especialidade: $("especialidade").value,
        data: $("data").value,
        hora: $("hora").value
      })
    });

    alert("Consulta agendada!");
    atualizar();

  } catch (e) {
    alert(e.message);
  }
}

async function carregarAgenda() {
  const consultas = await api("/api/consultas");

  $("agenda").innerHTML = consultas.map(c => `
    <tr>
      <td>${c.paciente}</td>
      <td>${c.especialidade}</td>
      <td>${c.data}</td>
      <td>${c.hora}</td>
    </tr>
  `).join("");
}

async function carregarUsuarios() {
  const usuarios = await api("/api/usuarios");

  $("usuarios").innerHTML = usuarios.map(u => `
    <tr>
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${u.perfil}</td>
    </tr>
  `).join("");
}

async function perguntar() {
  const input = $("pergunta");
  const texto = input.value.trim();

  if (!texto) return;

  adicionarMensagem(texto, "me");
  input.value = "";

  const carregando = adicionarMensagem(
    "Analisando...",
    "ai"
  );

  try {
    const resposta = await api("/api/ia", {
      method: "POST",
      body: JSON.stringify({
        mensagem: texto
      })
    });

    carregando.remove();
    adicionarMensagem(resposta.resposta, "ai");

  } catch (e) {
    carregando.remove();
    adicionarMensagem(
      "Não consegui processar sua solicitação.",
      "ai"
    );
  }
}

function adicionarMensagem(texto, tipo) {
  const div = document.createElement("div");

  div.className = `msg ${tipo}`;
  div.textContent = texto;

  $("chat").appendChild(div);
  $("chat").scrollTop = $("chat").scrollHeight;

  return div;
}
