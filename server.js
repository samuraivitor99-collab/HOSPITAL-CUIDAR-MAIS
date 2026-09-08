require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database(
  path.join(__dirname, "database.db"),
  err => {
    if (err) console.error("Erro SQLite:", err.message);
    else console.log("SQLite conectado.");
  }
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      perfil TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS consultas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente TEXT NOT NULL,
      email TEXT NOT NULL,
      especialidade TEXT NOT NULL,
      data TEXT NOT NULL,
      hora TEXT NOT NULL
    )
  `);

  const users = [
    ["Administrador", "admin@cuidar.com", "123", "admin"],
    ["Dr. Silva", "medico@cuidar.com", "123", "doctor"],
    ["Paciente Teste", "paciente@cuidar.com", "123", "user"]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO usuarios
    (nome, email, senha, perfil)
    VALUES (?, ?, ?, ?)
  `);

  users.forEach(user => stmt.run(user));

  stmt.finalize();
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", (req, res) => {
  const { email, senha, perfil } = req.body;

  if (!email || !senha || !perfil) {
    return res.status(400).json({
      error: "Preencha todos os campos."
    });
  }

  db.get(
    `
    SELECT id, nome, email, perfil
    FROM usuarios
    WHERE email = ?
    AND senha = ?
    AND perfil = ?
    `,
    [email, senha, perfil],
    (err, user) => {
      if (err) {
        console.error(err);

        return res.status(500).json({
          error: "Erro interno no banco de dados."
        });
      }

      if (!user) {
        return res.status(401).json({
          error: "E-mail, senha ou perfil inválido."
        });
      }

      res.json(user);
    }
  );
});

/* =========================
   CONSULTAS
========================= */

app.get("/api/consultas", (req, res) => {
  const { email } = req.query;

  const sql = email
    ? `
      SELECT *
      FROM consultas
      WHERE email = ?
      ORDER BY data, hora
    `
    : `
      SELECT *
      FROM consultas
      ORDER BY data, hora
    `;

  const params = email ? [email] : [];

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        error: "Erro ao carregar consultas."
      });
    }

    res.json(rows);
  });
});

app.post("/api/consultas", (req, res) => {
  const {
    paciente,
    email,
    especialidade,
    data,
    hora
  } = req.body;

  if (
    !paciente ||
    !email ||
    !especialidade ||
    !data ||
    !hora
  ) {
    return res.status(400).json({
      error: "Preencha todos os campos."
    });
  }

  db.get(
    `
    SELECT id
    FROM consultas
    WHERE data = ?
    AND hora = ?
    `,
    [data, hora],
    (err, consulta) => {
      if (err) {
        return res.status(500).json({
          error: "Erro ao verificar horário."
        });
      }

      if (consulta) {
        return res.status(409).json({
          error: "Esse horário já está ocupado."
        });
      }

      db.run(
        `
        INSERT INTO consultas
        (paciente, email, especialidade, data, hora)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          paciente,
          email,
          especialidade,
          data,
          hora
        ],
        function (err) {
          if (err) {
            console.error(err);

            return res.status(500).json({
              error: "Erro ao criar consulta."
            });
          }

          res.status(201).json({
            ok: true,
            id: this.lastID
          });
        }
      );
    }
  );
});

/* =========================
   USUÁRIOS
========================= */

app.get("/api/usuarios", (req, res) => {
  db.all(
    `
    SELECT id, nome, email, perfil
    FROM usuarios
    ORDER BY nome
    `,
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          error: "Erro ao carregar usuários."
        });
      }

      res.json(rows);
    }
  );
});

/* =========================
   IA
========================= */

app.post("/api/ia", async (req, res) => {
  const mensagem = String(
    req.body.mensagem || ""
  ).trim();

  if (!mensagem) {
    return res.status(400).json({
      error: "Mensagem vazia."
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.json({
      resposta:
        "A IA ainda não foi configurada. Adicione OPENAI_API_KEY ao arquivo .env."
    });
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: JSON.stringify({
          model:
            process.env.AI_MODEL || "gpt-5",

          instructions: `
Você é a IA Clínica do Cuidar+.

Responda sempre em português do Brasil.

Sua função é fornecer orientação inicial
de saúde de forma segura.

NUNCA:
- dê diagnóstico definitivo;
- prescreva medicamentos;
- indique doses;
- substitua avaliação médica.

Faça perguntas quando faltarem informações.

Considere:
idade aproximada;
duração dos sintomas;
intensidade;
localização;
sintomas associados;
medicamentos já utilizados;
condições relevantes.

Se houver sinais potencialmente graves,
oriente procurar atendimento médico urgente.

Se houver possível emergência,
oriente o usuário a procurar imediatamente
um serviço de emergência.

Se a situação parecer não urgente,
explique possibilidades gerais e próximos passos.

Seja claro, empático e objetivo.
          `,

          input: mensagem
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);

      return res.status(500).json({
        error:
          data.error?.message ||
          "Erro na API de IA."
      });
    }

    res.json({
      resposta:
        data.output_text ||
        "Não foi possível gerar uma resposta."
    });

  } catch (error) {
    console.error("IA:", error);

    res.status(500).json({
      error: "Erro de comunicação com a IA."
    });
  }
});

/* =========================
   ROTA PRINCIPAL
========================= */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

/* =========================
   404 JSON PARA API
========================= */

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "Endpoint não encontrado."
  });
});

/* =========================
   SERVIDOR
========================= */

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════╗
║          CUIDAR+             ║
║                              ║
║  http://localhost:${PORT}      ║
╚══════════════════════════════╝
`);
});
