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
  brasil: {
    firsts: ['Gabriel', 'Matheus', 'Lucas', 'Rodrigo', 'Vinícius', 'Thiago', 'Bruno', 'Douglas', 'Everton', 'Wesley', 'Caio', 'Rafael', 'Danilo', 'Igor', 'Murilo', 'Kaio'],
    lasts: ['Andrade', 'Batista', 'Cardoso', 'Duarte', 'Esteves', 'Franco', 'Guedes', 'Lacerda', 'Machado', 'Nogueira', 'Peixoto', 'Queiroz', 'Rezende', 'Siqueira', 'Teixeira', 'Vasques'],
  },
  'estados-unidos': {
    firsts: ['Tyler', 'Brandon', 'Weston', 'Cameron', 'Jordan', 'Trevor', 'Chase', 'Aaron', 'Dylan', 'Shane', 'Kellyn', 'Reggie', 'Malik', 'Bryce', 'Devon', 'Hunter'],
    lasts: ['Whitaker', 'Holloway', 'Bradley', 'Sanderson', 'Kimball', 'Rowley', 'Ferrell', 'Dawkins', 'Hollis', 'Sutter', 'Marsden', 'Boyle', 'Radcliff', 'Weaver', 'Norton', 'Ellery'],
  },
  honduras: {
    firsts: ['Alberth', 'Maynor', 'Wilson', 'Deybi', 'Kervin', 'Denil', 'Romell', 'Bryan', 'Edwin', 'Jorge', 'Óscar', 'Rubilio', 'Emilio', 'Alexander', 'Marcelo', 'Jhow'],
    lasts: ['Discua', 'Beckeles', 'Lozano', 'Chirinos', 'Quioto', 'Elis', 'Crisanto', 'Rivas', 'Bengtson', 'Álvarez', 'Sabillón', 'Meléndez', 'Arriaga', 'Vega', 'Maldonado', 'Acosta'],
  },
  'holanda-nz': {
    firsts: ['Liam', 'Ryan', 'Callum', 'Bill', 'Marco', 'Storm', 'Jesse', 'Elijah', 'Tommy', 'Clayton', 'Alex', 'Logan', 'Matthew', 'Joe', 'Dane', 'Cameron'],
    lasts: ['Tuiloma', 'Waine', 'Boxall', 'Garbett', 'Payne', 'Rufer', 'Stamenić', 'Just', 'Cacace', 'Barbarouses', 'Bindon', 'Lewis', 'Ridgway', 'Colvey', 'Ingham', 'Doyle'],
  },
  australia: {
    firsts: ['Jackson', 'Mitchell', 'Riley', 'Harry', 'Connor', 'Lachlan', 'Bailey', 'Cooper', 'Declan', 'Jamie', 'Craig', 'Nathaniel', 'Aiden', 'Kye', 'Brandon', 'Marco'],
    lasts: ['Hartley', 'Baccus', 'Metcalfe', 'Whelan', 'Goodwin', 'Atkinson', 'Behich', 'Wright', 'Deng', 'Mabil', 'Rowles', 'Souttar', 'Gersbach', 'Burgess', 'Redmayne', 'Hollman'],
  },
  japao: {
    firsts: ['Takumi', 'Ren', 'Sota', 'Yuto', 'Kaito', 'Hayato', 'Riku', 'Daiki', 'Shota', 'Kenta', 'Yuki', 'Ryo', 'Haruto', 'Kosei', 'Naoki', 'Tatsuya'],
    lasts: ['Matsuda', 'Kobayashi', 'Fujimoto', 'Ishikawa', 'Yamashita', 'Sakamoto', 'Nishida', 'Morita', 'Ogawa', 'Takeda', 'Hasegawa', 'Kurihara', 'Miyazaki', 'Aoyama', 'Uchida', 'Shimizu'],
  },
  'coreia-do-sul': {
    firsts: ['Min-jun', 'Ji-hoon', 'Seo-jun', 'Do-yun', 'Ha-jun', 'Eun-woo', 'Si-woo', 'Jae-hyun', 'Tae-yang', 'Woo-jin', 'Hyun-woo', 'Sung-min', 'Jun-seo', 'Dong-hyun', 'Ye-jun', 'Gun-woo'],
    lasts: ['Kang', 'Yoon', 'Jang', 'Lim', 'Shin', 'Oh', 'Han', 'Seo', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Ryu', 'Baek', 'Nam', 'Cho'],
  },
  'africa-do-sul': {
    firsts: ['Thabo', 'Sipho', 'Lebo', 'Kagiso', 'Tshepo', 'Bongani', 'Mandla', 'Katlego', 'Themba', 'Lucky', 'Percy', 'Siyabonga', 'Teboho', 'Refiloe', 'Aubrey', 'Keagan'],
    lasts: ['Mokoena', 'Ndlovu', 'Dlamini', 'Zwane', 'Mashego', 'Nkosi', 'Sithole', 'Mabaso', 'Radebe', 'Khumalo', 'Maluleka', 'Sekgota', 'Mbatha', 'Mothiba', 'Ngcobo', 'Baartman'],
  },
  nigeria: {
    firsts: ['Chidi', 'Emeka', 'Kelechi', 'Uche', 'Ifeanyi', 'Obinna', 'Samuel', 'Ola', 'Musa', 'Tunde', 'Chukwu', 'Ebere', 'Femi', 'Nnamdi', 'Sadiq', 'Kalu'],
    lasts: ['Adeyemi', 'Onwuka', 'Balogun', 'Ekong', 'Ndidi', 'Aribo', 'Chukwueze', 'Olayinka', 'Ajayi', 'Iheanacho', 'Ogundele', 'Nwabali', 'Bassey', 'Adegoke', 'Umeh', 'Oyedele'],
  },
  argelia: {
    firsts: ['Yacine', 'Riyad', 'Sofiane', 'Islam', 'Amine', 'Nabil', 'Karim', 'Adem', 'Ramy', 'Youcef', 'Hicham', 'Mehdi', 'Bilal', 'Farid', 'Zakaria', 'Anis'],
    lasts: ['Benzia', 'Bounedjah', 'Zerrouki', 'Mandi', 'Atal', 'Boudaoui', 'Chaibi', 'Guedioura', 'Belaïli', 'Tahrat', 'Ounas', 'Zeghba', 'Bensebaini', 'Amoura', 'Ghezzal', 'Delort'],
  },
  gana: {
    firsts: ['Kwame', 'Kofi', 'Yaw', 'Kojo', 'Mohammed', 'Daniel', 'Ernest', 'Baba', 'Elisha', 'Fatawu', 'Alidu', 'Osman', 'Gideon', 'Abdul', 'Joseph', 'Emmanuel'],
    lasts: ['Owusu', 'Mensah', 'Boateng', 'Asamoah', 'Amartey', 'Djiku', 'Sulemana', 'Kudus', 'Semenyo', 'Nuamah', 'Adjei', 'Opoku', 'Kyereh', 'Bediako', 'Lamptey', 'Amoah'],
  },
  camaroes: {
    firsts: ['Vincent', 'Karl', 'Bryan', 'Olivier', 'Jean', 'Christian', 'Nicolas', 'Georges', 'Martin', 'Frank', 'André', 'Ambroise', 'Collins', 'Wilfried', 'Enzo', 'Léandre'],
    lasts: ['Ngadeu', 'Tolo', 'Mbeumo', 'Ntcham', 'Onana', 'Fai', 'Anguissa', 'Ebosse', 'Wooh', 'Toko', 'Mbekeli', 'Nkoulou', 'Choupo', 'Bassogog', 'Kunde', 'Etoundi'],
  },
  'costa-do-marfim': {
    firsts: ['Sébastien', 'Franck', 'Ibrahim', 'Serge', 'Jean', 'Amad', 'Nicolas', 'Willy', 'Odilon', 'Yahia', 'Seko', 'Ghislain', 'Christian', 'Karim', 'Oumar', 'Simon'],
    lasts: ['Kessié', 'Sangaré', 'Diomandé', 'Konaté', 'Boly', 'Aurier', 'Gradel', 'Bailly', 'Doumbia', 'Zaha', 'Fofana', 'Sylla', 'Kouassi', 'Traoré', 'Koné', 'Cissé'],
  },
  grecia: {
    firsts: ['Giorgos', 'Dimitris', 'Kostas', 'Anastasios', 'Petros', 'Vangelis', 'Manolis', 'Sokratis', 'Christos', 'Alexandros', 'Panagiotis', 'Nikos', 'Stefanos', 'Lazaros', 'Ilias', 'Thanasis'],
    lasts: ['Mantalos', 'Bakasetas', 'Siopis', 'Retsos', 'Tzolakis', 'Vagiannidis', 'Pelkas', 'Kourbelis', 'Zafeiris', 'Ioannidis', 'Konstantelias', 'Douvikas', 'Giannoulis', 'Baldock', 'Masouras', 'Rota'],
  },
  eslovenia: {
    firsts: ['Jan', 'Miha', 'Luka', 'Nejc', 'Timi', 'Žan', 'Benjamin', 'Andraž', 'Adam', 'Vanja', 'Petar', 'Erik', 'David', 'Sandi', 'Tomi', 'Rok'],
    lasts: ['Oblak', 'Verbič', 'Bijol', 'Stojanović', 'Elšnik', 'Črnigoj', 'Karničnik', 'Zajc', 'Gnezda', 'Horvat', 'Lovrić', 'Drkušić', 'Balkovec', 'Vipotnik', 'Šporar', 'Blažič'],
  },
  eslovaquia: {
    firsts: ['Milan', 'Juraj', 'Ondrej', 'Lukáš', 'Dávid', 'Tomáš', 'Matúš', 'Peter', 'Róbert', 'Adam', 'Denis', 'Ivan', 'Patrik', 'Michal', 'Norbert', 'Samuel'],
    lasts: ['Duda', 'Kucka', 'Hancko', 'Škriniar', 'Bénes', 'Suslov', 'Vavro', 'Lobotka', 'Haraslín', 'Bozeník', 'Rusnák', 'Gyömbér', 'Obert', 'Strelec', 'Pekarík', 'Dubravka'],
  },
  servia: {
    firsts: ['Nikola', 'Aleksandar', 'Marko', 'Filip', 'Luka', 'Dušan', 'Stefan', 'Uroš', 'Miloš', 'Nemanja', 'Sergej', 'Andrija', 'Veljko', 'Strahinja', 'Ivan', 'Lazar'],
    lasts: ['Milenković', 'Živković', 'Gudelj', 'Pavlović', 'Ilić', 'Kostić', 'Ristić', 'Racić', 'Babić', 'Jovanović', 'Samardžić', 'Terzić', 'Erakovic', 'Mimović', 'Radonjić', 'Stojić'],
  },
  dinamarca: {
    firsts: ['Mikkel', 'Rasmus', 'Jonas', 'Anders', 'Kasper', 'Andreas', 'Jesper', 'Frederik', 'Emil', 'Joakim', 'Victor', 'Mathias', 'Oliver', 'Nicolai', 'Magnus', 'Alexander'],
    lasts: ['Damsgaard', 'Wind', 'Nørgaard', 'Bruun', 'Kristensen', 'Skov', 'Højbjerg', 'Jensen', 'Andersen', 'Poulsen', 'Dolberg', 'Vestergaard', 'Bah', 'Christensen', 'Lerager', 'Olsen'],
  },
  noruega: {
    firsts: ['Martin', 'Kristian', 'Sander', 'Ola', 'Håkon', 'Jørgen', 'Fredrik', 'Emil', 'Mats', 'Andreas', 'Morten', 'Sivert', 'Leo', 'Torbjørn', 'Ulrik', 'Oscar'],
    lasts: ['Berge', 'Sørloth', 'Thorsby', 'Ryerson', 'Strand', 'Aursnes', 'Bjørkan', 'Østigård', 'Nusa', 'Myhre', 'Hanche', 'Solbakken', 'Elyounoussi', 'Kjetland', 'Bobb', 'Ellingsen'],
  },
  suica: {
    firsts: ['Fabian', 'Remo', 'Silvan', 'Noah', 'Ruben', 'Michel', 'Andi', 'Renato', 'Dan', 'Nico', 'Zeki', 'Cédric', 'Loris', 'Denis', 'Vincent', 'Filip'],
    lasts: ['Widmer', 'Freuler', 'Rieder', 'Aebischer', 'Vargas', 'Ndoye', 'Amdouni', 'Steffen', 'Sierro', 'Elvedi', 'Kobel', 'Zesiger', 'Stergiou', 'Schmidt', 'Jashari', 'Sow'],
  },

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
