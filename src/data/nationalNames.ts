/**
 * Nomes críveis por nacionalidade para o mercado — um belga não se chama
 * João Silva. Combinações aleatórias de nomes COMUNS de cada país
 * (nenhuma pessoa específica; sobrenomes icônicos de atletas evitados).
 */

interface NamePool {
  readonly firsts: readonly string[]
  readonly lasts: readonly string[]
}

export const NATIONAL_NAMES: Record<string, NamePool> = {
  argentina: {
    firsts: ['Joaquín', 'Nicolás', 'Santiago', 'Agustín', 'Facundo', 'Matías', 'Tomás', 'Franco', 'Gonzalo', 'Ezequiel', 'Ramiro', 'Bautista', 'Ignacio', 'Julián', 'Lucio', 'Valentín'],
    lasts: ['Acosta', 'Benítez', 'Cabral', 'Domínguez', 'Escobar', 'Figueroa', 'Giménez', 'Herrera', 'Juárez', 'Ledesma', 'Molina', 'Núñez', 'Ojeda', 'Pereyra', 'Quiroga', 'Sosa'],
  },
  uruguai: {
    firsts: ['Matías', 'Bruno', 'Diego', 'Facundo', 'Maxi', 'Nahuel', 'Rodrigo', 'Sebastián', 'Emiliano', 'Gastón', 'Leandro', 'Marcelo', 'Nicolás', 'Pablo', 'Santiago', 'Federico'],
    lasts: ['Silveira', 'Olivera', 'Machado', 'Barreto', 'Techera', 'Viera', 'Acuña', 'Larrosa', 'Curbelo', 'Perdomo', 'Fagúndez', 'Santurio', 'Coitiño', 'Aguerre', 'Rivero', 'Umpiérrez'],
  },
  chile: {
    firsts: ['Benjamín', 'Matías', 'Vicente', 'Cristóbal', 'Ignacio', 'Diego', 'Felipe', 'Joaquín', 'Martín', 'Nicolás', 'Pablo', 'Gonzalo', 'Esteban', 'Camilo', 'Rodrigo', 'Bastián'],
    lasts: ['Rojas', 'Fuentes', 'Soto', 'Contreras', 'Araya', 'Sepúlveda', 'Carrasco', 'Espinoza', 'Valenzuela', 'Valdés', 'Salinas', 'Vergara', 'Godoy', 'Riffo', 'Cornejo', 'Toledo'],
  },
  paraguai: {
    firsts: ['Óscar', 'Derlis', 'Ángel', 'Cecilio', 'Rodrigo', 'Blas', 'Iván', 'Marcelo', 'Gustavo', 'Junior', 'Alcides', 'Osmar', 'Ramón', 'Édgar', 'Celso', 'Diosnel'],
    lasts: ['Villalba', 'Ortiz', 'Riveros', 'Samudio', 'Aquino', 'Espínola', 'Galeano', 'Cañete', 'Morínigo', 'Duarte', 'Ovelar', 'Zárate', 'Insfrán', 'Cabañas', 'Ferreira', 'Rolón'],
  },
  mexico: {
    firsts: ['Santiago', 'Emiliano', 'Diego', 'Alexis', 'Uriel', 'Carlos', 'Jesús', 'Luis', 'Ángel', 'Erick', 'Osvaldo', 'Rodolfo', 'Gerardo', 'Ulises', 'Marco', 'Adrián'],
    lasts: ['Hernández', 'Ramírez', 'Cruz', 'Flores', 'Gutiérrez', 'Mendoza', 'Aguilar', 'Salgado', 'Rangel', 'Cervantes', 'Zavala', 'Quintero', 'Barrera', 'Ríos', 'Montes', 'Cázares'],
  },
  colombia: {
    firsts: ['Juan', 'Camilo', 'Andrés', 'Santiago', 'Mateo', 'Sebastián', 'Cristian', 'Kevin', 'Yeison', 'Brayan', 'Jhon', 'Wilmar', 'Édgar', 'Fredy', 'Harold', 'Miguel'],
    lasts: ['Cardona', 'Restrepo', 'Zapata', 'Quintero', 'Mosquera', 'Valencia', 'Palacios', 'Murillo', 'Arango', 'Bocanegra', 'Rentería', 'Salazar', 'Bedoya', 'Castaño', 'Giraldo', 'Uribe'],
  },
  equador: {
    firsts: ['Ángel', 'Bryan', 'Carlos', 'Jefferson', 'Moisés', 'Renato', 'Jordy', 'Kevin', 'Aníbal', 'Junior', 'Washington', 'Édison', 'Fricson', 'Segundo', 'Gonzalo', 'Holger'],
    lasts: ['Cevallos', 'Quiñónez', 'Zambrano', 'Chalá', 'Espinoza', 'Ayoví', 'Tenorio', 'Montaño', 'Angulo', 'Arboleda', 'Preciado', 'Bone', 'Corozo', 'Vernaza', 'Padilla', 'Macías'],
  },
  portugal: {
    firsts: ['Diogo', 'Gonçalo', 'Rúben', 'Tiago', 'André', 'Nuno', 'Ricardo', 'Miguel', 'Bruno', 'Vasco', 'Duarte', 'Afonso', 'Rui', 'Bernardo', 'Hélder', 'Renato'],
    lasts: ['Fernandes', 'Carvalho', 'Antunes', 'Coelho', 'Tavares', 'Fonseca', 'Guerreiro', 'Pinto', 'Matos', 'Barros', 'Leite', 'Neves', 'Faria', 'Brandão', 'Sequeira', 'Vilela'],
  },
  espanha: {
    firsts: ['Álvaro', 'Sergio', 'Pablo', 'Iker', 'Adrián', 'Diego', 'Javier', 'Marcos', 'Rubén', 'Iván', 'Raúl', 'Mario', 'Hugo', 'Dani', 'Unai', 'Gonzalo'],
    lasts: ['García', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Romero', 'Torres', 'Navarro', 'Molina', 'Ortega', 'Vargas', 'Castillo', 'Serrano', 'Ibáñez', 'Marín', 'Salas'],
  },
  franca: {
    firsts: ['Antoine', 'Lucas', 'Théo', 'Maxime', 'Julien', 'Romain', 'Bastien', 'Clément', 'Florian', 'Mathis', 'Nolan', 'Rémi', 'Alexandre', 'Damien', 'Yanis', 'Corentin'],
    lasts: ['Moreau', 'Lefebvre', 'Dubois', 'Fontaine', 'Garnier', 'Rousseau', 'Lambert', 'Chevalier', 'Perrin', 'Marchand', 'Barbier', 'Renard', 'Leclerc', 'Baudin', 'Carpentier', 'Voisin'],
  },
  italia: {
    firsts: ['Marco', 'Luca', 'Matteo', 'Alessandro', 'Davide', 'Federico', 'Simone', 'Andrea', 'Riccardo', 'Stefano', 'Lorenzo', 'Fabio', 'Nicolò', 'Tommaso', 'Emanuele', 'Gianluca'],
    lasts: ['Rossi', 'Bianchi', 'Romano', 'Greco', 'Conti', 'Ricci', 'Marino', 'Gallo', 'Ferrara', 'Rinaldi', 'Caruso', 'Villa', 'Serra', 'Moretti', 'Barone', 'De Luca'],
  },
  alemanha: {
    firsts: ['Lukas', 'Felix', 'Jonas', 'Leon', 'Niklas', 'Tobias', 'Moritz', 'Florian', 'Jan', 'Timo', 'Marcel', 'Sven', 'Matthias', 'Björn', 'Kai', 'Lars'],
    lasts: ['Müller', 'Schmidt', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann', 'Schulz', 'Keller', 'Braun', 'Krüger', 'Lehmann', 'Brandt', 'Vogel', 'Berger', 'Franke'],
  },
  inglaterra: {
    firsts: ['Jack', 'Harry', 'Oliver', 'George', 'Callum', 'Mason', 'Lewis', 'Kieran', 'Ashley', 'Jordan', 'Reece', 'Bradley', 'Connor', 'Danny', 'Joe', 'Sam'],
    lasts: ['Walker', 'Turner', 'Hughes', 'Robinson', 'Clarke', 'Bennett', 'Fletcher', 'Palmer', 'Barnes', 'Dawson', 'Whitfield', 'Mercer', 'Colton', 'Radford', 'Ellison', 'Frost'],
  },
  holanda: {
    firsts: ['Daan', 'Sven', 'Bram', 'Jesse', 'Thijs', 'Lars', 'Ruben', 'Niels', 'Joris', 'Wouter', 'Stijn', 'Koen', 'Maarten', 'Timo', 'Bas', 'Rick'],
    lasts: ['Van der Berg', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Mulder', 'De Vries', 'Van Leeuwen', 'Kuipers', 'Hendriks', 'Willems', 'Verhoeven', 'Jansen', 'Brouwer', 'Dekker', 'Timmermans'],
  },
  belgica: {
    firsts: ['Arne', 'Senne', 'Wout', 'Jef', 'Lander', 'Milan', 'Robbe', 'Tuur', 'Cyriel', 'Maxim', 'Jarne', 'Seppe', 'Loïc', 'Thibault', 'Gilles', 'Amaury'],
    lasts: ['Vermeulen', 'Claes', 'Maes', 'Peeters', 'Willems', 'Goossens', 'Wouters', 'De Smet', 'Lemmens', 'Dupont', 'Lambrechts', 'Segers', 'Michiels', 'Van Acker', 'Declercq', 'Borremans'],
  },
}

/** Nome completo da nacionalidade (rolls 0-1); null se não houver banco (brasil usa o próprio). */
export const nationalName = (nationId: string, rollFirst: number, rollLast: number): string | null => {
  const pool = NATIONAL_NAMES[nationId]
  if (!pool) return null
  const first = pool.firsts[Math.floor(rollFirst * pool.firsts.length) % pool.firsts.length]
  const last = pool.lasts[Math.floor(rollLast * pool.lasts.length) % pool.lasts.length]
  return `${first} ${last}`
}
