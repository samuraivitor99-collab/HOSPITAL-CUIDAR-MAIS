

// ==========================
// BANCO LOCAL
// ==========================


const Banco = {


usuarios:[

{
nome:"Administrador",
email:"admin@cuidar.com",
senha:"123",
perfil:"admin"
},


{
nome:"Dr. Silva",
email:"medico@cuidar.com",
senha:"123",
perfil:"doctor"
},


{
nome:"Paciente Teste",
email:"paciente@cuidar.com",
senha:"123",
perfil:"user"
}

],



consultas:[],


mensagens:[]


};



// Recuperar dados

if(localStorage.usuarios){

Banco.usuarios =
JSON.parse(localStorage.usuarios);

}


if(localStorage.consultas){

Banco.consultas =
JSON.parse(localStorage.consultas);

}


if(localStorage.mensagens){

Banco.mensagens =
JSON.parse(localStorage.mensagens);

}




let usuarioAtual=null;






// ==========================
// LOGIN
// ==========================


function loginSistema(){



let email =
document.getElementById("email").value;


let senha =
document.getElementById("password").value;


let perfil =
document.getElementById("role").value;



let usuario =
Banco.usuarios.find(u=>

u.email==email &&
u.senha==senha &&
u.perfil==perfil

);



if(!usuario){

alert("Login inválido");

return;

}



usuarioAtual=usuario;



document.getElementById("auth")
.style.display="none";


document.getElementById("system")
.style.display="block";



document.getElementById("username")
.innerText =
usuario.nome;



let badge =
document.getElementById("userBadge");



if(usuario.perfil=="admin"){


badge.innerText="Administrador";

badge.className=
"badge badge-admin";


}

else if(usuario.perfil=="doctor"){


badge.innerText="Médico";

badge.className=
"badge badge-doctor";


}

else{


badge.innerText="Paciente";

badge.className=
"badge badge-user";


}




document.getElementById("adminMenu")
.style.display =
usuario.perfil=="admin"
?
"block"
:
"none";



document.getElementById("doctorMenu")
.style.display =
usuario.perfil=="doctor"
?
"block"
:
"none";



atualizarSistema();


}







// ==========================
// LOGOUT
// ==========================


function logoutSistema(){


usuarioAtual=null;


document.getElementById("system")
.style.display="none";


document.getElementById("auth")
.style.display="flex";


}






// ==========================
// NAVEGAÇÃO
// ==========================


function abrirPagina(nome){


document
.querySelectorAll(".page")
.forEach(p=>{

p.classList.remove("active");

});


document
.getElementById(nome)
.classList.add("active");



document
.getElementById("title")
.innerText=
nome.toUpperCase();



atualizarSistema();


}







// ==========================
// CONSULTAS
// ==========================


function criarConsulta(){


if(usuarioAtual.perfil!="user"){

alert("Somente pacientes podem agendar");

return;

}



let consulta={


paciente:
usuarioAtual.nome,


email:
usuarioAtual.email,


especialidade:
document.getElementById("especialidade").value,


data:
document.getElementById("dataConsulta").value,


hora:
document.getElementById("horaConsulta").value


};



if(!consulta.data ||
!consulta.hora){

alert("Preencha data e horário");

return;

}



Banco.consultas.push(consulta);



salvar();



alert("Consulta agendada");


atualizarSistema();


}





function salvar(){


localStorage.usuarios =
JSON.stringify(Banco.usuarios);


localStorage.consultas =
JSON.stringify(Banco.consultas);


localStorage.mensagens =
JSON.stringify(Banco.mensagens);


}







// ==========================
// CHAT
// ==========================


function enviarMensagem(){


let texto =
document.getElementById("mensagem").value;



if(!texto)return;



Banco.mensagens.push({

autor:
usuarioAtual.nome,

texto:texto,

hora:
new Date()
.toLocaleTimeString()


});



salvar();



document.getElementById("mensagem")
.value="";


carregarChat();


}




function carregarChat(){


let area =
document.getElementById("chatArea");


if(!area)return;


area.innerHTML="";



Banco.mensagens.forEach(m=>{


area.innerHTML+=`

<div class="msg ${
m.autor==usuarioAtual.nome
?"me"
:"other"
}">

<b>${m.autor}</b>

<br>

${m.texto}

<br>

<small>${m.hora}</small>

</div>

`;


});


}







// ==========================
// IA
// ==========================


function perguntarIA(){



let texto =
document.getElementById("perguntaIA").value;



if(!texto)return;



let area =
document.getElementById("iaArea");



area.innerHTML+=`

<div class="msg me">

${texto}

</div>

`;



let resposta =
"Recomendo avaliação médica.";



if(texto.toLowerCase()
.includes("dor")){


resposta=
"Informe intensidade da dor e localização.";


}


if(texto.toLowerCase()
.includes("febre")){


resposta=
"Verifique a temperatura e procure atendimento se persistir.";


}




setTimeout(()=>{


area.innerHTML+=`

<div class="msg other">

🤖 ${resposta}

</div>

`;



},600);



}







// ==========================
// ATUALIZAÇÃO
// ==========================


function atualizarSistema(){



let lista =
document.getElementById(
"appointmentsList"
);



if(lista){


lista.innerHTML="";



Banco.consultas
.filter(c=>

c.email==usuarioAtual.email

)
.forEach(c=>{


lista.innerHTML+=`

<div class="card">

${c.especialidade}

<br>

${c.data}
-
${c.hora}

</div>

`;

});


}





let tabela =
document.getElementById(
"usuariosTabela"
);



if(tabela){


tabela.innerHTML="";


Banco.usuarios.forEach(u=>{


tabela.innerHTML+=`

<tr>

<td>${u.nome}</td>

<td>${u.email}</td>

<td>${u.perfil}</td>

</tr>

`;

});


}





let medico =
document.getElementById(
"agendaMedica"
);



if(medico){


medico.innerHTML="";


Banco.consultas.forEach(c=>{


medico.innerHTML+=`

<tr>

<td>${c.paciente}</td>

<td>${c.especialidade}</td>

<td>${c.data}</td>

<td>${c.hora}</td>

</tr>

`;

});


}



carregarChat();


}



</script>


</body>

</html>
