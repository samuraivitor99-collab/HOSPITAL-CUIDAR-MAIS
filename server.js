require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database(
  path.join(__dirname, "database.db")
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

  const usuarios = [
    [
      "Administrador",
      "admin@cuidar.com",
      "123",
      "admin"
    ],
    [
      "Dr. Silva",
      "medico@cuidar.com",
      "123",
      "doctor"
    ],
    [
      "Paciente Teste",
      "paciente@cuidar.com",
      "123",
      "user"
    ]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO usuarios
    (nome,email,senha,perfil)
    VALUES (?,?,?,?)
  `);

  usuarios.forEach(u => stmt.run(u));

  stmt.finalize();
});

app.post("/api/login", (req, res) => {

  const { email, senha, perfil } = req.body;

  db.get(
    `SELECT id,nome,email,perfil
     FROM usuarios
     WHERE email=? AND senha=? AND perfil=?`,
    [email, senha, perfil],
    (err, user) => {

      if (err)
        return res.status(500).json({
          error: "Erro no banco"
        });

      if (!user)
        return res.status(401).json({
          error: "Credenciais inválidas"
        });

      res.json(user);
    }
  );
});

app.get("/api/consultas", (req, res) => {

  const sql = req.query.email
    ? "SELECT * FROM consultas WHERE email=? ORDER BY data,hora"
    : "SELECT * FROM consultas ORDER BY data,hora";

  const params = req.query.email
    ? [req.query.email]
    : [];

  db.all(sql, params, (err, rows) => {

    if (err)
      return res.status(500).json({
        error: "Erro ao buscar consultas"
      });

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

  if (!paciente || !email || !especialidade || !data || !hora)
    return res.status(400).json({
      error: "Preencha todos os campos"
    });

  db.get(
    `SELECT id FROM consultas
     WHERE data=? AND hora=?`,
    [data, hora],
    (err, existente) => {

      if (err)
        return res.status(500).json({
          error: "Erro no banco"
        });

      if (existente)
        return res.status(409).json({
          error: "Horário já ocupado"
        });

      db.run(
        `INSERT INTO consultas
        (paciente,email,especialidade,data,hora)
        VALUES (?,?,?,?,?)`,
        [
          paciente,
          email,
          especialidade,
          data,
          hora
        ],
        err => {

          if (err)
            return res.status(500).json({
              error: "Não foi possível agendar"
            });

          res.json({
            ok: true
          });
        }
      );
    }
  );
});

app.get("/api/usuarios", (req, res) => {

  db.all(
    `SELECT id,nome,email,perfil
     FROM usuarios
     ORDER BY nome`,
    (err, rows) => {

      if (err)
        return res.status(500).json({
          error: "Erro ao buscar usuários"
        });

      res.json(rows);
    }
  );
});

app.post("/api/ia", async (req, res) => {

  const mensagem = String(
    req.body.mensagem || ""
  ).trim();

  if (!mensagem)
    return res.status(400).json({
      error: "Mensagem vazia"
    });

  /*
   * A chave da IA fica no servidor.
   * Nunca coloque OPENAI_API_KEY no app.js.
   */

  if (!process.env.OPENAI_API_KEY) {

    return res.json({
      resposta:
        "IA não configurada. Adicione OPENAI_API_KEY ao arquivo .env."
    });
  }

  try {

    const resposta = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: JSON.stringify({
          model: process.env.AI_MODEL || "gpt-5",
          instructions: `
Você é o Cuidar+ IA Clinical.

Seu objetivo é auxiliar o usuário com orientação
de saúde de forma segura, clara e responsável.

Regras:
- Não invente diagnósticos.
- Não prescreva medicamentos.
- Não substitua um médico.
- Faça perguntas relevantes quando faltarem informações.
- Explique possibilidades sem afirmar diagnóstico.
- Identifique sinais de emergência.
- Se houver sinais graves, recomende procurar
  atendimento de emergência imediatamente.
- Seja objetivo.
- Responda em português do Brasil.
          `,
          input: mensagem
        })
      }
    );

    const data = await resposta.json();

    if (!resposta.ok)
      throw new Error(
        data.error?.message || "Erro na IA"
      );

    res.json({
      resposta:
        data.output_text ||
        "Não foi possível gerar uma resposta."
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Falha na inteligência clínica"
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Cuidar+ rodando em http://localhost:${PORT}`
  );
});

