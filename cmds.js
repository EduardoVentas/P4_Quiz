const {log, biglog, errorlog, colorize} = require("./out");
const {models} = require('./model');
const Sequelize = require ('sequelize');


/* Ayuda */

exports.helpCmd = (socket, rl) => {
	log(socket, "Comandos:");
  	log(socket, "	h|help -Muestra esta ayuda.");
  	log(socket, "	list - Listar los quizzes existentes.");
  	log(socket, " 	show<id> - Muestra la pregunta y la respuesta del quiz indicado.");
  	log(socket, "	delete <id> - Borra el quiz indicado.");
  	log(socket, "	edit <id> - Editar el quiz indicado.");
   	log(socket, " 	test <id> - Probar le quiz indicado.");
   	log(socket, "	p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
   	log(socket,  "	credits - Créditos");
   	log(socket, " 	q|quiz - Salir del programa.");
   	rl.prompt();
};

/* Lista */

exports.listCmd = (socket,rl) => {
	

	models.quiz.findAll()
	.each(quiz => {		
			log(socket, `[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
	})
	.catch(error => {
		errorlog(socket, error.message);
	}) 
	.then(() => {
		rl.prompt();
	});
};

/* Muestra el quiz indicado */

const validateId = (id) => {
	return new Sequelize.Promise((resolve, reject) => {
		if (typeof id === "undefined"){
			reject(new Error('Falta el parámetro <id>.'));
		} else {
			id = parseInt (id);
			if (Number.isNaN(id)) {
				reject(new Error('El valor del parámetro <id> no es un número'));
			} else {
				resolve(id);
			}
		}
	});
};

exports.showCmd = (socket, rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz){
			throw new Error(`No existe un quiz asociado al id=${id}.`);
		}
		log(socket, `[${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
	})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

const makeQuestion = (rl, text) => {
	return new Sequelize.Promise((resolve, reject) => {
		rl.question(colorize(text, 'red'), answer => {
			resolve(answer.trim());
		});
	});
};

exports.addCmd = (socket, rl) => {
	makeQuestion(rl, 'Introduzca una pregunta: ')
	.then(q => {
		return makeQuestion(rl, 'Introduzca la respuesta ')
		.then(a => {
			return {question: q, answer: a};
		});
	})
	.then(quiz => {
		return models.quiz.create(quiz);
	})
	.then((quiz) => {
		log(socket, `  ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog(socket, 'El quiz es erroneo:');
		error.errors.forEach(({message}) => errorlog(socket, message));
	})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(() =>{
		rl.prompt();
	})
};

exports.deleteCmd = (socket, rl, id) => {
	validateId(id)
	.then(id => models.quiz.destroy({where: {id}}))
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

exports.editCmd = (socket, rl, id) => {
   validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if(!quiz){
      throw new Error(`No existe un quiz asociado al id=${id}.`);
    }
    //rl.write()
    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
    return makeQuestion(rl, 'Introduzca la pregunta: ')
    .then(q => {
      process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
      return makeQuestion(rl, 'Introduzca la respuesta: ')
      .then(a => {
        quiz.question = q;
        quiz.answer = a;
        return quiz;
      });
    });
  })
  .then(quiz => {
    return quiz.save();
  })
  .then(quiz => {
    log(socket, ` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(Sequelize.ValidationError, error => {
    errorlog(socket, 'El quiz es erroneo:');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(socket, error.message);
  })
  .then(() =>{
     rl.prompt();
});	
	
};


exports.testCmd = (socket, rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz){
			throw new Error(`No existe un quiz asociado al id=${id}.`);
		}
		makeQuestion(rl, quiz.question)
			.then(answer => {
				if(answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()) {
					log(socket, 'Su respuesta es correcta ');
					biglog(socket, 'Correcta', 'green');
					rl.prompt();
				}
				else {
					log(socket, 'Su respuesta es incorrecta ');
					biglog(socket, 'Incorrecta', 'red');
					rl.prompt();
				}
			})
		})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(() => {
		rl.prompt();
	})
};



exports.playCmd = (socket, rl) => {
	let score = 0;
	let toBeAsked=[];


	const playOne=()=>{
		return new Promise((resolve, reject) => {
			if(toBeAsked.length===0){
				log(socket, `No hay nada mas que preguntar`);
				log(socket, `Tu resultado ha sido:`);
					resolve();
					return;
			}
			let preguntar = Math.floor(Math.random()*toBeAsked.length);
			let quiz = toBeAsked[preguntar];
			toBeAsked.splice(preguntar,1);
			makeQuestion(rl, quiz.question)
			.then(answer => {
				if(answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()) {
					score += 1;
					log(socket, `Correcto - Lleva ${score} aciertos`);
					resolve(playOne());
				}else{
					log(socket, `INCORRECTO`);
					log(socket, `Fin del juego. Aciertos: ${score}`);
					resolve();

				}		

			  })
		 	})
		}

	models.quiz.findAll({raw:true})
	.then(quizzes => {
		toBeAsked = quizzes;
	})

	.then(() => {
		return playOne();
	})
	.catch(e => {
		errorlog(socket, "Error:" + e);
	})
	.then(() => {
		biglog(socket, score, 'magenta');
		rl.prompt();

	})
}

		

exports.creditsCmd = rl => {
	log(socket, "Autores de la practica:");
  	log(socket, 'Guillermo del Pino Barragán', 'green');
	log(socket, 'Eduardo Ventas Maestre', 'green');
  	rl.prompt();
};

exports.quitCmd = (socket,rl) => {
	rl.close();
	socket.end();
}; 