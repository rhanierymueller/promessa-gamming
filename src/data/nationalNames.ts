/**
 * Nomes críveis por nacionalidade para o mercado — um belga não se chama
 * João Silva. Combinações aleatórias de nomes COMUNS de cada país
 * (nenhuma pessoa específica; sobrenomes icônicos de atletas evitados).
 */

interface NamePool {
  readonly firsts: readonly string[]
  /** Mesma quantidade da lista masculina — o mundo feminino tem o mesmo leque. */
  readonly firstsF: readonly string[]
  /** Sobrenomes servem aos dois: na maioria das línguas do jogo não flexionam. */
  readonly lasts: readonly string[]
}

export const NATIONAL_NAMES: Record<string, NamePool> = {
  brasil: {
    firsts: ['Gabriel', 'Matheus', 'Lucas', 'Rodrigo', 'Vinícius', 'Thiago', 'Bruno', 'Douglas', 'Everton', 'Wesley', 'Caio', 'Rafael', 'Danilo', 'Igor', 'Murilo', 'Kaio'],
    firstsF: ['Ana', 'Bruna', 'Camila', 'Débora', 'Fernanda', 'Gabriela', 'Isabela', 'Juliana', 'Larissa', 'Mariana', 'Rafaela', 'Tainá', 'Vitória', 'Yasmin', 'Letícia', 'Priscila'],
    lasts: ['Andrade', 'Batista', 'Cardoso', 'Duarte', 'Esteves', 'Franco', 'Guedes', 'Lacerda', 'Machado', 'Nogueira', 'Peixoto', 'Queiroz', 'Rezende', 'Siqueira', 'Teixeira', 'Vasques'],
  },
  'estados-unidos': {
    firsts: ['Tyler', 'Brandon', 'Weston', 'Cameron', 'Jordan', 'Trevor', 'Chase', 'Aaron', 'Dylan', 'Shane', 'Kellyn', 'Reggie', 'Malik', 'Bryce', 'Devon', 'Hunter'],
    firstsF: ['Alex', 'Mallory', 'Rose', 'Sophia', 'Trinity', 'Emily', 'Lindsey', 'Casey', 'Ashley', 'Naomi', 'Jaedyn', 'Savannah', 'Tierna', 'Kelley', 'Hailie', 'Croix'],
    lasts: ['Whitaker', 'Holloway', 'Bradley', 'Sanderson', 'Kimball', 'Rowley', 'Ferrell', 'Dawkins', 'Hollis', 'Sutter', 'Marsden', 'Boyle', 'Radcliff', 'Weaver', 'Norton', 'Ellery'],
  },
  honduras: {
    firsts: ['Alberth', 'Maynor', 'Wilson', 'Deybi', 'Kervin', 'Denil', 'Romell', 'Bryan', 'Edwin', 'Jorge', 'Óscar', 'Rubilio', 'Emilio', 'Alexander', 'Marcelo', 'Jhow'],
    firstsF: ['Mariela', 'Suyapa', 'Yoselin', 'Genesis', 'Karol', 'Nery', 'Wendy', 'Fabiola', 'Kimberly', 'Dilcia', 'Ariana', 'Josselin', 'Heidy', 'Marlen', 'Xiomara', 'Alba'],
    lasts: ['Discua', 'Beckeles', 'Lozano', 'Chirinos', 'Quioto', 'Elis', 'Crisanto', 'Rivas', 'Bengtson', 'Álvarez', 'Sabillón', 'Meléndez', 'Arriaga', 'Vega', 'Maldonado', 'Acosta'],
  },
  'holanda-nz': {
    firsts: ['Liam', 'Ryan', 'Callum', 'Bill', 'Marco', 'Storm', 'Jesse', 'Elijah', 'Tommy', 'Clayton', 'Alex', 'Logan', 'Matthew', 'Joe', 'Dane', 'Cameron'],
    firstsF: ['Hannah', 'Ria', 'Meikayla', 'Katie', 'Betsy', 'Grace', 'Olivia', 'Paige', 'Claudia', 'Malia', 'Milly', 'Indiah', 'Kate', 'Emma', 'Anna', 'Michaela'],
    lasts: ['Tuiloma', 'Waine', 'Boxall', 'Garbett', 'Payne', 'Rufer', 'Stamenić', 'Just', 'Cacace', 'Barbarouses', 'Bindon', 'Lewis', 'Ridgway', 'Colvey', 'Ingham', 'Doyle'],
  },
  australia: {
    firsts: ['Jackson', 'Mitchell', 'Riley', 'Harry', 'Connor', 'Lachlan', 'Bailey', 'Cooper', 'Declan', 'Jamie', 'Craig', 'Nathaniel', 'Aiden', 'Kye', 'Brandon', 'Marco'],
    firstsF: ['Sam', 'Ellie', 'Steph', 'Mary', 'Caitlin', 'Hayley', 'Clare', 'Alanna', 'Kyra', 'Emily', 'Charlotte', 'Courtney', 'Tameka', 'Amy', 'Cortnee', 'Winonah'],
    lasts: ['Hartley', 'Baccus', 'Metcalfe', 'Whelan', 'Goodwin', 'Atkinson', 'Behich', 'Wright', 'Deng', 'Mabil', 'Rowles', 'Souttar', 'Gersbach', 'Burgess', 'Redmayne', 'Hollman'],
  },
  japao: {
    firsts: ['Takumi', 'Ren', 'Sota', 'Yuto', 'Kaito', 'Hayato', 'Riku', 'Daiki', 'Shota', 'Kenta', 'Yuki', 'Ryo', 'Haruto', 'Kosei', 'Naoki', 'Tatsuya'],
    firstsF: ['Yui', 'Hina', 'Aoi', 'Sakura', 'Rin', 'Mei', 'Nana', 'Kokoro', 'Riko', 'Miu', 'Hikaru', 'Saki', 'Yuka', 'Momoko', 'Aya', 'Nozomi'],
    lasts: ['Matsuda', 'Kobayashi', 'Fujimoto', 'Ishikawa', 'Yamashita', 'Sakamoto', 'Nishida', 'Morita', 'Ogawa', 'Takeda', 'Hasegawa', 'Kurihara', 'Miyazaki', 'Aoyama', 'Uchida', 'Shimizu'],
  },
  'coreia-do-sul': {
    firsts: ['Min-jun', 'Ji-hoon', 'Seo-jun', 'Do-yun', 'Ha-jun', 'Eun-woo', 'Si-woo', 'Jae-hyun', 'Tae-yang', 'Woo-jin', 'Hyun-woo', 'Sung-min', 'Jun-seo', 'Dong-hyun', 'Ye-jun', 'Gun-woo'],
    firstsF: ['Ji-woo', 'Seo-yeon', 'Ha-eun', 'Min-seo', 'Su-bin', 'Ye-eun', 'Da-hye', 'Chae-won', 'So-hee', 'Eun-ji', 'Na-yeon', 'Hye-jin', 'Yu-jin', 'Ji-min', 'Bo-ram', 'Se-ra'],
    lasts: ['Kang', 'Yoon', 'Jang', 'Lim', 'Shin', 'Oh', 'Han', 'Seo', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Ryu', 'Baek', 'Nam', 'Cho'],
  },
  'africa-do-sul': {
    firsts: ['Thabo', 'Sipho', 'Lebo', 'Kagiso', 'Tshepo', 'Bongani', 'Mandla', 'Katlego', 'Themba', 'Lucky', 'Percy', 'Siyabonga', 'Teboho', 'Refiloe', 'Aubrey', 'Keagan'],
    firstsF: ['Thembi', 'Nomsa', 'Lerato', 'Refilwe', 'Zanele', 'Busisiwe', 'Andile', 'Noko', 'Sibongile', 'Amanda', 'Karabo', 'Palesa', 'Jermaine', 'Linda', 'Nthabiseng', 'Hildah'],
    lasts: ['Mokoena', 'Ndlovu', 'Dlamini', 'Zwane', 'Mashego', 'Nkosi', 'Sithole', 'Mabaso', 'Radebe', 'Khumalo', 'Maluleka', 'Sekgota', 'Mbatha', 'Mothiba', 'Ngcobo', 'Baartman'],
  },
  nigeria: {
    firsts: ['Chidi', 'Emeka', 'Kelechi', 'Uche', 'Ifeanyi', 'Obinna', 'Samuel', 'Ola', 'Musa', 'Tunde', 'Chukwu', 'Ebere', 'Femi', 'Nnamdi', 'Sadiq', 'Kalu'],
    firstsF: ['Chiamaka', 'Ngozi', 'Amarachi', 'Adaeze', 'Ifeoma', 'Blessing', 'Uchenna', 'Nkechi', 'Rasheedat', 'Halimah', 'Onome', 'Chidinma', 'Toluwalase', 'Gift', 'Esther', 'Aisha'],
    lasts: ['Adeyemi', 'Onwuka', 'Balogun', 'Ekong', 'Ndidi', 'Aribo', 'Chukwueze', 'Olayinka', 'Ajayi', 'Iheanacho', 'Ogundele', 'Nwabali', 'Bassey', 'Adegoke', 'Umeh', 'Oyedele'],
  },
  argelia: {
    firsts: ['Yacine', 'Riyad', 'Sofiane', 'Islam', 'Amine', 'Nabil', 'Karim', 'Adem', 'Ramy', 'Youcef', 'Hicham', 'Mehdi', 'Bilal', 'Farid', 'Zakaria', 'Anis'],
    firstsF: ['Amina', 'Nesrine', 'Yasmine', 'Lina', 'Sarah', 'Meriem', 'Imene', 'Katia', 'Chaima', 'Ines', 'Hadjer', 'Rania', 'Kenza', 'Nour', 'Souad', 'Malak'],
    lasts: ['Benzia', 'Bounedjah', 'Zerrouki', 'Mandi', 'Atal', 'Boudaoui', 'Chaibi', 'Guedioura', 'Belaïli', 'Tahrat', 'Ounas', 'Zeghba', 'Bensebaini', 'Amoura', 'Ghezzal', 'Delort'],
  },
  gana: {
    firsts: ['Kwame', 'Kofi', 'Yaw', 'Kojo', 'Mohammed', 'Daniel', 'Ernest', 'Baba', 'Elisha', 'Fatawu', 'Alidu', 'Osman', 'Gideon', 'Abdul', 'Joseph', 'Emmanuel'],
    firstsF: ['Abena', 'Akosua', 'Adjoa', 'Afia', 'Yaa', 'Ama', 'Efua', 'Grace', 'Priscilla', 'Mukarama', 'Doris', 'Sandra', 'Elizabeth', 'Janet', 'Comfort', 'Rasheedatu'],
    lasts: ['Owusu', 'Mensah', 'Boateng', 'Asamoah', 'Amartey', 'Djiku', 'Sulemana', 'Kudus', 'Semenyo', 'Nuamah', 'Adjei', 'Opoku', 'Kyereh', 'Bediako', 'Lamptey', 'Amoah'],
  },
  camaroes: {
    firsts: ['Vincent', 'Karl', 'Bryan', 'Olivier', 'Jean', 'Christian', 'Nicolas', 'Georges', 'Martin', 'Frank', 'André', 'Ambroise', 'Collins', 'Wilfried', 'Enzo', 'Léandre'],
    firstsF: ['Gabrielle', 'Ajara', 'Michaela', 'Estelle', 'Christine', 'Raissa', 'Nchout', 'Aboudi', 'Genevieve', 'Marlyse', 'Charlene', 'Yvonne', 'Aurelle', 'Falone', 'Claudine', 'Ninon'],
    lasts: ['Ngadeu', 'Tolo', 'Mbeumo', 'Ntcham', 'Onana', 'Fai', 'Anguissa', 'Ebosse', 'Wooh', 'Toko', 'Mbekeli', 'Nkoulou', 'Choupo', 'Bassogog', 'Kunde', 'Etoundi'],
  },
  'costa-do-marfim': {
    firsts: ['Sébastien', 'Franck', 'Ibrahim', 'Serge', 'Jean', 'Amad', 'Nicolas', 'Willy', 'Odilon', 'Yahia', 'Seko', 'Ghislain', 'Christian', 'Karim', 'Oumar', 'Simon'],
    firstsF: ['Ines', 'Aminata', 'Nadege', 'Rita', 'Sophie', 'Binta', 'Fatou', 'Mariam', 'Josee', 'Rebecca', 'Aicha', 'Cynthia', 'Awa', 'Kadidiatou', 'Sandrine', 'Chantal'],
    lasts: ['Kessié', 'Sangaré', 'Diomandé', 'Konaté', 'Boly', 'Aurier', 'Gradel', 'Bailly', 'Doumbia', 'Zaha', 'Fofana', 'Sylla', 'Kouassi', 'Traoré', 'Koné', 'Cissé'],
  },
  grecia: {
    firsts: ['Giorgos', 'Dimitris', 'Kostas', 'Anastasios', 'Petros', 'Vangelis', 'Manolis', 'Sokratis', 'Christos', 'Alexandros', 'Panagiotis', 'Nikos', 'Stefanos', 'Lazaros', 'Ilias', 'Thanasis'],
    firstsF: ['Eleni', 'Maria', 'Katerina', 'Sofia', 'Ioanna', 'Anastasia', 'Despina', 'Georgia', 'Vasiliki', 'Christina', 'Angeliki', 'Dimitra', 'Marianna', 'Evgenia', 'Zoi', 'Panagiota'],
    lasts: ['Mantalos', 'Bakasetas', 'Siopis', 'Retsos', 'Tzolakis', 'Vagiannidis', 'Pelkas', 'Kourbelis', 'Zafeiris', 'Ioannidis', 'Konstantelias', 'Douvikas', 'Giannoulis', 'Baldock', 'Masouras', 'Rota'],
  },
  eslovenia: {
    firsts: ['Jan', 'Miha', 'Luka', 'Nejc', 'Timi', 'Žan', 'Benjamin', 'Andraž', 'Adam', 'Vanja', 'Petar', 'Erik', 'David', 'Sandi', 'Tomi', 'Rok'],
    firstsF: ['Ana', 'Nika', 'Maja', 'Eva', 'Zala', 'Lara', 'Sara', 'Neja', 'Tjaša', 'Špela', 'Kaja', 'Lucija', 'Mateja', 'Urška', 'Petra', 'Manca'],
    lasts: ['Oblak', 'Verbič', 'Bijol', 'Stojanović', 'Elšnik', 'Črnigoj', 'Karničnik', 'Zajc', 'Gnezda', 'Horvat', 'Lovrić', 'Drkušić', 'Balkovec', 'Vipotnik', 'Šporar', 'Blažič'],
  },
  eslovaquia: {
    firsts: ['Milan', 'Juraj', 'Ondrej', 'Lukáš', 'Dávid', 'Tomáš', 'Matúš', 'Peter', 'Róbert', 'Adam', 'Denis', 'Ivan', 'Patrik', 'Michal', 'Norbert', 'Samuel'],
    firstsF: ['Zuzana', 'Mária', 'Lucia', 'Petra', 'Veronika', 'Simona', 'Michaela', 'Diana', 'Patrícia', 'Kristína', 'Dominika', 'Alexandra', 'Nikola', 'Jana', 'Katarína', 'Ivana'],
    lasts: ['Duda', 'Kucka', 'Hancko', 'Škriniar', 'Bénes', 'Suslov', 'Vavro', 'Lobotka', 'Haraslín', 'Bozeník', 'Rusnák', 'Gyömbér', 'Obert', 'Strelec', 'Pekarík', 'Dubravka'],
  },
  servia: {
    firsts: ['Nikola', 'Aleksandar', 'Marko', 'Filip', 'Luka', 'Dušan', 'Stefan', 'Uroš', 'Miloš', 'Nemanja', 'Sergej', 'Andrija', 'Veljko', 'Strahinja', 'Ivan', 'Lazar'],
    firstsF: ['Jovana', 'Milica', 'Ana', 'Marija', 'Tijana', 'Sara', 'Nevena', 'Katarina', 'Dragana', 'Ivana', 'Aleksandra', 'Tamara', 'Jelena', 'Nataša', 'Bojana', 'Andrijana'],
    lasts: ['Milenković', 'Živković', 'Gudelj', 'Pavlović', 'Ilić', 'Kostić', 'Ristić', 'Racić', 'Babić', 'Jovanović', 'Samardžić', 'Terzić', 'Erakovic', 'Mimović', 'Radonjić', 'Stojić'],
  },
  dinamarca: {
    firsts: ['Mikkel', 'Rasmus', 'Jonas', 'Anders', 'Kasper', 'Andreas', 'Jesper', 'Frederik', 'Emil', 'Joakim', 'Victor', 'Mathias', 'Oliver', 'Nicolai', 'Magnus', 'Alexander'],
    firstsF: ['Pernille', 'Signe', 'Nadia', 'Sofie', 'Katrine', 'Rikke', 'Frederikke', 'Emma', 'Josefine', 'Amalie', 'Sanne', 'Stine', 'Janni', 'Karen', 'Luna', 'Mille'],
    lasts: ['Damsgaard', 'Wind', 'Nørgaard', 'Bruun', 'Kristensen', 'Skov', 'Højbjerg', 'Jensen', 'Andersen', 'Poulsen', 'Dolberg', 'Vestergaard', 'Bah', 'Christensen', 'Lerager', 'Olsen'],
  },
  noruega: {
    firsts: ['Martin', 'Kristian', 'Sander', 'Ola', 'Håkon', 'Jørgen', 'Fredrik', 'Emil', 'Mats', 'Andreas', 'Morten', 'Sivert', 'Leo', 'Torbjørn', 'Ulrik', 'Oscar'],
    firstsF: ['Ada', 'Ingrid', 'Guro', 'Caroline', 'Frida', 'Maren', 'Vilde', 'Synne', 'Julie', 'Elisabeth', 'Karina', 'Amalie', 'Tuva', 'Marit', 'Anja', 'Emilie'],
    lasts: ['Berge', 'Sørloth', 'Thorsby', 'Ryerson', 'Strand', 'Aursnes', 'Bjørkan', 'Østigård', 'Nusa', 'Myhre', 'Hanche', 'Solbakken', 'Elyounoussi', 'Kjetland', 'Bobb', 'Ellingsen'],
  },
  suica: {
    firsts: ['Fabian', 'Remo', 'Silvan', 'Noah', 'Ruben', 'Michel', 'Andi', 'Renato', 'Dan', 'Nico', 'Zeki', 'Cédric', 'Loris', 'Denis', 'Vincent', 'Filip'],
    firstsF: ['Ana', 'Ramona', 'Lia', 'Alisha', 'Coumba', 'Riola', 'Géraldine', 'Noelle', 'Meriame', 'Svenja', 'Naomi', 'Luana', 'Aurélie', 'Sandrine', 'Iman', 'Nadine'],
    lasts: ['Widmer', 'Freuler', 'Rieder', 'Aebischer', 'Vargas', 'Ndoye', 'Amdouni', 'Steffen', 'Sierro', 'Elvedi', 'Kobel', 'Zesiger', 'Stergiou', 'Schmidt', 'Jashari', 'Sow'],
  },

  argentina: {
    firsts: ['Joaquín', 'Nicolás', 'Santiago', 'Agustín', 'Facundo', 'Matías', 'Tomás', 'Franco', 'Gonzalo', 'Ezequiel', 'Ramiro', 'Bautista', 'Ignacio', 'Julián', 'Lucio', 'Valentín'],
    firstsF: ['Sofía', 'Valentina', 'Martina', 'Camila', 'Julieta', 'Agustina', 'Lucía', 'Florencia', 'Micaela', 'Rocío', 'Brenda', 'Milagros', 'Paula', 'Ailén', 'Carla', 'Yamila'],
    lasts: ['Acosta', 'Benítez', 'Cabral', 'Domínguez', 'Escobar', 'Figueroa', 'Giménez', 'Herrera', 'Juárez', 'Ledesma', 'Molina', 'Núñez', 'Ojeda', 'Pereyra', 'Quiroga', 'Sosa'],
  },
  uruguai: {
    firsts: ['Matías', 'Bruno', 'Diego', 'Facundo', 'Maxi', 'Nahuel', 'Rodrigo', 'Sebastián', 'Emiliano', 'Gastón', 'Leandro', 'Marcelo', 'Nicolás', 'Pablo', 'Santiago', 'Federico'],
    firstsF: ['Valentina', 'Lucía', 'Camila', 'Sofía', 'Belén', 'Victoria', 'Daniela', 'Romina', 'Natalia', 'Paula', 'Ximena', 'Andrea', 'Fabiana', 'Carolina', 'Antonella', 'Mariana'],
    lasts: ['Silveira', 'Olivera', 'Machado', 'Barreto', 'Techera', 'Viera', 'Acuña', 'Larrosa', 'Curbelo', 'Perdomo', 'Fagúndez', 'Santurio', 'Coitiño', 'Aguerre', 'Rivero', 'Umpiérrez'],
  },
  chile: {
    firsts: ['Benjamín', 'Matías', 'Vicente', 'Cristóbal', 'Ignacio', 'Diego', 'Felipe', 'Joaquín', 'Martín', 'Nicolás', 'Pablo', 'Gonzalo', 'Esteban', 'Camilo', 'Rodrigo', 'Bastián'],
    firstsF: ['Javiera', 'Constanza', 'Catalina', 'Fernanda', 'Antonia', 'Valentina', 'Daniela', 'Francisca', 'Isidora', 'Camila', 'Rosario', 'Paulina', 'Trinidad', 'Bárbara', 'Karen', 'Yanara'],
    lasts: ['Rojas', 'Fuentes', 'Soto', 'Contreras', 'Araya', 'Sepúlveda', 'Carrasco', 'Espinoza', 'Valenzuela', 'Valdés', 'Salinas', 'Vergara', 'Godoy', 'Riffo', 'Cornejo', 'Toledo'],
  },
  paraguai: {
    firsts: ['Óscar', 'Derlis', 'Ángel', 'Cecilio', 'Rodrigo', 'Blas', 'Iván', 'Marcelo', 'Gustavo', 'Junior', 'Alcides', 'Osmar', 'Ramón', 'Édgar', 'Celso', 'Diosnel'],
    firstsF: ['Liz', 'Fabiola', 'Jessica', 'Rebeca', 'Marizza', 'Camila', 'Gloria', 'Dahiana', 'Ramona', 'Analía', 'Lourdes', 'Zunilda', 'Nadia', 'Belén', 'Tania', 'Fátima'],
    lasts: ['Villalba', 'Ortiz', 'Riveros', 'Samudio', 'Aquino', 'Espínola', 'Galeano', 'Cañete', 'Morínigo', 'Duarte', 'Ovelar', 'Zárate', 'Insfrán', 'Cabañas', 'Ferreira', 'Rolón'],
  },
  mexico: {
    firsts: ['Santiago', 'Emiliano', 'Diego', 'Alexis', 'Uriel', 'Carlos', 'Jesús', 'Luis', 'Ángel', 'Erick', 'Osvaldo', 'Rodolfo', 'Gerardo', 'Ulises', 'Marco', 'Adrián'],
    firstsF: ['Guadalupe', 'Renata', 'Ximena', 'Valeria', 'Fernanda', 'Alondra', 'Itzel', 'Regina', 'Karla', 'Mariana', 'Citlali', 'Andrea', 'Jimena', 'Dulce', 'Brenda', 'Yaretzi'],
    lasts: ['Hernández', 'Ramírez', 'Cruz', 'Flores', 'Gutiérrez', 'Mendoza', 'Aguilar', 'Salgado', 'Rangel', 'Cervantes', 'Zavala', 'Quintero', 'Barrera', 'Ríos', 'Montes', 'Cázares'],
  },
  colombia: {
    firsts: ['Juan', 'Camilo', 'Andrés', 'Santiago', 'Mateo', 'Sebastián', 'Cristian', 'Kevin', 'Yeison', 'Brayan', 'Jhon', 'Wilmar', 'Édgar', 'Fredy', 'Harold', 'Miguel'],
    firstsF: ['Daniela', 'Catalina', 'Manuela', 'Valeria', 'Luisa', 'Paulina', 'Yoreli', 'Leicy', 'Diana', 'Carolina', 'Natalia', 'Angie', 'Wendy', 'Tatiana', 'Milena', 'Nicol'],
    lasts: ['Cardona', 'Restrepo', 'Zapata', 'Quintero', 'Mosquera', 'Valencia', 'Palacios', 'Murillo', 'Arango', 'Bocanegra', 'Rentería', 'Salazar', 'Bedoya', 'Castaño', 'Giraldo', 'Uribe'],
  },
  equador: {
    firsts: ['Ángel', 'Bryan', 'Carlos', 'Jefferson', 'Moisés', 'Renato', 'Jordy', 'Kevin', 'Aníbal', 'Junior', 'Washington', 'Édison', 'Fricson', 'Segundo', 'Gonzalo', 'Holger'],
    firstsF: ['Kerly', 'Mayra', 'Ambar', 'Nayely', 'Denise', 'Joselyn', 'Madelin', 'Anahí', 'Gabriela', 'Karen', 'Ligia', 'Estefanía', 'Yomira', 'Xiomara', 'Nicole', 'Erika'],
    lasts: ['Cevallos', 'Quiñónez', 'Zambrano', 'Chalá', 'Espinoza', 'Ayoví', 'Tenorio', 'Montaño', 'Angulo', 'Arboleda', 'Preciado', 'Bone', 'Corozo', 'Vernaza', 'Padilla', 'Macías'],
  },
  portugal: {
    firsts: ['Diogo', 'Gonçalo', 'Rúben', 'Tiago', 'André', 'Nuno', 'Ricardo', 'Miguel', 'Bruno', 'Vasco', 'Duarte', 'Afonso', 'Rui', 'Bernardo', 'Hélder', 'Renato'],
    firstsF: ['Matilde', 'Beatriz', 'Carolina', 'Inês', 'Leonor', 'Mariana', 'Diana', 'Joana', 'Tatiana', 'Andreia', 'Fátima', 'Vanessa', 'Telma', 'Ana', 'Cláudia', 'Sílvia'],
    lasts: ['Fernandes', 'Carvalho', 'Antunes', 'Coelho', 'Tavares', 'Fonseca', 'Guerreiro', 'Pinto', 'Matos', 'Barros', 'Leite', 'Neves', 'Faria', 'Brandão', 'Sequeira', 'Vilela'],
  },
  espanha: {
    firsts: ['Álvaro', 'Sergio', 'Pablo', 'Iker', 'Adrián', 'Diego', 'Javier', 'Marcos', 'Rubén', 'Iván', 'Raúl', 'Mario', 'Hugo', 'Dani', 'Unai', 'Gonzalo'],
    firstsF: ['Lucía', 'Paula', 'Marta', 'Irene', 'Alba', 'Aitana', 'Claudia', 'Nerea', 'Olga', 'Sandra', 'Esther', 'Mapi', 'Salma', 'Vicky', 'Laia', 'Amaia'],
    lasts: ['García', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Romero', 'Torres', 'Navarro', 'Molina', 'Ortega', 'Vargas', 'Castillo', 'Serrano', 'Ibáñez', 'Marín', 'Salas'],
  },
  franca: {
    firsts: ['Antoine', 'Lucas', 'Théo', 'Maxime', 'Julien', 'Romain', 'Bastien', 'Clément', 'Florian', 'Mathis', 'Nolan', 'Rémi', 'Alexandre', 'Damien', 'Yanis', 'Corentin'],
    firstsF: ['Camille', 'Amandine', 'Élise', 'Léa', 'Manon', 'Chloé', 'Sarah', 'Océane', 'Delphine', 'Estelle', 'Marion', 'Clara', 'Charlotte', 'Inès', 'Maëlle', 'Julie'],
    lasts: ['Moreau', 'Lefebvre', 'Dubois', 'Fontaine', 'Garnier', 'Rousseau', 'Lambert', 'Chevalier', 'Perrin', 'Marchand', 'Barbier', 'Renard', 'Leclerc', 'Baudin', 'Carpentier', 'Voisin'],
  },
  italia: {
    firsts: ['Marco', 'Luca', 'Matteo', 'Alessandro', 'Davide', 'Federico', 'Simone', 'Andrea', 'Riccardo', 'Stefano', 'Lorenzo', 'Fabio', 'Nicolò', 'Tommaso', 'Emanuele', 'Gianluca'],
    firstsF: ['Giulia', 'Chiara', 'Martina', 'Francesca', 'Valentina', 'Sara', 'Alice', 'Elena', 'Arianna', 'Barbara', 'Cristiana', 'Manuela', 'Lisa', 'Aurora', 'Gloria', 'Federica'],
    lasts: ['Rossi', 'Bianchi', 'Romano', 'Greco', 'Conti', 'Ricci', 'Marino', 'Gallo', 'Ferrara', 'Rinaldi', 'Caruso', 'Villa', 'Serra', 'Moretti', 'Barone', 'De Luca'],
  },
  alemanha: {
    firsts: ['Lukas', 'Felix', 'Jonas', 'Leon', 'Niklas', 'Tobias', 'Moritz', 'Florian', 'Jan', 'Timo', 'Marcel', 'Sven', 'Matthias', 'Björn', 'Kai', 'Lars'],
    firstsF: ['Lena', 'Marie', 'Laura', 'Sophia', 'Alexandra', 'Klara', 'Svenja', 'Merle', 'Jule', 'Nina', 'Felicitas', 'Sydney', 'Lea', 'Anna', 'Giulia', 'Sara'],
    lasts: ['Müller', 'Schmidt', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann', 'Schulz', 'Keller', 'Braun', 'Krüger', 'Lehmann', 'Brandt', 'Vogel', 'Berger', 'Franke'],
  },
  inglaterra: {
    firsts: ['Jack', 'Harry', 'Oliver', 'George', 'Callum', 'Mason', 'Lewis', 'Kieran', 'Ashley', 'Jordan', 'Reece', 'Bradley', 'Connor', 'Danny', 'Joe', 'Sam'],
    firstsF: ['Lucy', 'Chloe', 'Millie', 'Ella', 'Beth', 'Georgia', 'Rachel', 'Jess', 'Katie', 'Alessia', 'Niamh', 'Lauren', 'Grace', 'Hannah', 'Demi', 'Esme'],
    lasts: ['Walker', 'Turner', 'Hughes', 'Robinson', 'Clarke', 'Bennett', 'Fletcher', 'Palmer', 'Barnes', 'Dawson', 'Whitfield', 'Mercer', 'Colton', 'Radford', 'Ellison', 'Frost'],
  },
  holanda: {
    firsts: ['Daan', 'Sven', 'Bram', 'Jesse', 'Thijs', 'Lars', 'Ruben', 'Niels', 'Joris', 'Wouter', 'Stijn', 'Koen', 'Maarten', 'Timo', 'Bas', 'Rick'],
    firstsF: ['Lieke', 'Sanne', 'Danielle', 'Jill', 'Vivianne', 'Merel', 'Kika', 'Esmee', 'Anouk', 'Femke', 'Renate', 'Jackie', 'Lynn', 'Wieke', 'Marisa', 'Katja'],
    lasts: ['Van der Berg', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Mulder', 'De Vries', 'Van Leeuwen', 'Kuipers', 'Hendriks', 'Willems', 'Verhoeven', 'Jansen', 'Brouwer', 'Dekker', 'Timmermans'],
  },
  belgica: {
    firsts: ['Arne', 'Senne', 'Wout', 'Jef', 'Lander', 'Milan', 'Robbe', 'Tuur', 'Cyriel', 'Maxim', 'Jarne', 'Seppe', 'Loïc', 'Thibault', 'Gilles', 'Amaury'],
    firstsF: ['Tessa', 'Janice', 'Justine', 'Amber', 'Laura', 'Elena', 'Sari', 'Davina', 'Marie', 'Jarne', 'Hannah', 'Charlotte', 'Lenie', 'Feli', 'Noömi', 'Britt'],
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
