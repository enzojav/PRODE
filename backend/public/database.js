// ============================================================
//  DATABASE.JS — Todos los datos de la aplicación
// ============================================================

const DB_TEAMS = [
  { id: 1, name: "Equipo Supervisores",        area: "Calidad",      color: "#6CACE4" },
  { id: 2, name: "Equipo Coordinadores",       area: "Coordinación", color: "#FFB81C" },
  { id: 3, name: "Equipo Coordinador Calidad", area: "Calidad",      color: "#85bde8" },
  { id: 4, name: "Gerente",                    area: "Gerencia",     color: "#002470" },
];

const DB_MEMBERS = [
  { id: 1, name: "Enzo Aguirre",    role: "Desarrollo",      teamId: 1 },
  { id: 2, name: "Leonel Sanagua",  role: "Coordinador",     teamId: 1 },
  { id: 3, name: "Pamela Ribero",   role: "Supervisora",     teamId: 1 },
  { id: 4, name: "Paulo",           role: "Supervisor",      teamId: 2 },
  { id: 5, name: "Mariana Cruz",    role: "Gerente",         teamId: 4 },
  { id: 6, name: "Jesus Gimenez",   role: "Coordinador",     teamId: 2 },
  { id: 7, name: "Marcos Tornesse", role: "Gerente Calidad", teamId: 4 },
  { id: 8, name: "Belen deluca",    role: "Supervisora",     teamId: 3 },
];

const DB_SCORE_CATEGORIES = [
  { id: 1, name: "Calidad de entregables",   icon: "📦", weight: 1.5 },
  { id: 2, name: "Cumplimiento de plazos",   icon: "⏰", weight: 1.2 },
  { id: 3, name: "Capacitaciones aprobadas", icon: "🎓", weight: 1.0 },
  { id: 4, name: "Satisfacción del cliente", icon: "⭐", weight: 1.3 },
  { id: 5, name: "Innovación y mejoras",     icon: "💡", weight: 0.8 },
];

const DB_SCORES = [
  { memberId:1, categoryId:1, period:"Ene 2026", value:9.1 },
  { memberId:1, categoryId:2, period:"Ene 2026", value:8.7 },
  { memberId:1, categoryId:3, period:"Ene 2026", value:9.5 },
  { memberId:1, categoryId:4, period:"Ene 2026", value:8.9 },
  { memberId:1, categoryId:5, period:"Ene 2026", value:7.8 },
  { memberId:2, categoryId:1, period:"Ene 2026", value:8.2 },
  { memberId:2, categoryId:2, period:"Ene 2026", value:7.9 },
  { memberId:2, categoryId:3, period:"Ene 2026", value:8.5 },
  { memberId:2, categoryId:4, period:"Ene 2026", value:8.0 },
  { memberId:2, categoryId:5, period:"Ene 2026", value:7.2 },
  { memberId:3, categoryId:1, period:"Ene 2026", value:9.3 },
  { memberId:3, categoryId:2, period:"Ene 2026", value:8.8 },
  { memberId:3, categoryId:3, period:"Ene 2026", value:9.0 },
  { memberId:3, categoryId:4, period:"Ene 2026", value:9.2 },
  { memberId:3, categoryId:5, period:"Ene 2026", value:8.1 },
  { memberId:4, categoryId:1, period:"Ene 2026", value:8.6 },
  { memberId:4, categoryId:2, period:"Ene 2026", value:9.1 },
  { memberId:4, categoryId:3, period:"Ene 2026", value:9.5 },
  { memberId:4, categoryId:4, period:"Ene 2026", value:8.8 },
  { memberId:4, categoryId:5, period:"Ene 2026", value:7.5 },
  { memberId:5, categoryId:1, period:"Ene 2026", value:7.8 },
  { memberId:5, categoryId:2, period:"Ene 2026", value:8.2 },
  { memberId:5, categoryId:3, period:"Ene 2026", value:8.4 },
  { memberId:5, categoryId:4, period:"Ene 2026", value:7.9 },
  { memberId:5, categoryId:5, period:"Ene 2026", value:6.9 },
  { memberId:6, categoryId:1, period:"Ene 2026", value:7.5 },
  { memberId:6, categoryId:2, period:"Ene 2026", value:7.8 },
  { memberId:6, categoryId:3, period:"Ene 2026", value:8.1 },
  { memberId:6, categoryId:4, period:"Ene 2026", value:7.6 },
  { memberId:6, categoryId:5, period:"Ene 2026", value:6.8 },
  { memberId:7, categoryId:1, period:"Ene 2026", value:8.9 },
  { memberId:7, categoryId:2, period:"Ene 2026", value:9.0 },
  { memberId:7, categoryId:3, period:"Ene 2026", value:9.2 },
  { memberId:7, categoryId:4, period:"Ene 2026", value:8.7 },
  { memberId:7, categoryId:5, period:"Ene 2026", value:8.0 },
  { memberId:8, categoryId:1, period:"Ene 2026", value:8.0 },
  { memberId:8, categoryId:2, period:"Ene 2026", value:8.3 },
  { memberId:8, categoryId:3, period:"Ene 2026", value:7.9 },
  { memberId:8, categoryId:4, period:"Ene 2026", value:8.1 },
  { memberId:8, categoryId:5, period:"Ene 2026", value:7.3 },
  { memberId:1, categoryId:1, period:"Abr 2026", value:9.8 },
  { memberId:1, categoryId:2, period:"Abr 2026", value:9.5 },
  { memberId:1, categoryId:3, period:"Abr 2026", value:9.6 },
  { memberId:1, categoryId:4, period:"Abr 2026", value:9.4 },
  { memberId:1, categoryId:5, period:"Abr 2026", value:9.0 },
  { memberId:2, categoryId:1, period:"Abr 2026", value:8.9 },
  { memberId:2, categoryId:2, period:"Abr 2026", value:8.6 },
  { memberId:2, categoryId:3, period:"Abr 2026", value:9.2 },
  { memberId:2, categoryId:4, period:"Abr 2026", value:8.8 },
  { memberId:2, categoryId:5, period:"Abr 2026", value:8.0 },
  { memberId:3, categoryId:1, period:"Abr 2026", value:9.4 },
  { memberId:3, categoryId:2, period:"Abr 2026", value:9.5 },
  { memberId:3, categoryId:3, period:"Abr 2026", value:9.3 },
  { memberId:3, categoryId:4, period:"Abr 2026", value:9.6 },
  { memberId:3, categoryId:5, period:"Abr 2026", value:8.8 },
  { memberId:4, categoryId:1, period:"Abr 2026", value:9.2 },
  { memberId:4, categoryId:2, period:"Abr 2026", value:9.7 },
  { memberId:4, categoryId:3, period:"Abr 2026", value:9.8 },
  { memberId:4, categoryId:4, period:"Abr 2026", value:9.4 },
  { memberId:4, categoryId:5, period:"Abr 2026", value:8.3 },
  { memberId:5, categoryId:1, period:"Abr 2026", value:8.5 },
  { memberId:5, categoryId:2, period:"Abr 2026", value:8.8 },
  { memberId:5, categoryId:3, period:"Abr 2026", value:9.0 },
  { memberId:5, categoryId:4, period:"Abr 2026", value:8.6 },
  { memberId:5, categoryId:5, period:"Abr 2026", value:7.8 },
  { memberId:6, categoryId:1, period:"Abr 2026", value:8.1 },
  { memberId:6, categoryId:2, period:"Abr 2026", value:8.4 },
  { memberId:6, categoryId:3, period:"Abr 2026", value:8.7 },
  { memberId:6, categoryId:4, period:"Abr 2026", value:8.2 },
  { memberId:6, categoryId:5, period:"Abr 2026", value:7.5 },
  { memberId:7, categoryId:1, period:"Abr 2026", value:9.5 },
  { memberId:7, categoryId:2, period:"Abr 2026", value:9.6 },
  { memberId:7, categoryId:3, period:"Abr 2026", value:9.7 },
  { memberId:7, categoryId:4, period:"Abr 2026", value:9.3 },
  { memberId:7, categoryId:5, period:"Abr 2026", value:8.7 },
  { memberId:8, categoryId:1, period:"Abr 2026", value:8.6 },
  { memberId:8, categoryId:2, period:"Abr 2026", value:8.9 },
  { memberId:8, categoryId:3, period:"Abr 2026", value:8.5 },
  { memberId:8, categoryId:4, period:"Abr 2026", value:8.7 },
  { memberId:8, categoryId:5, period:"Abr 2026", value:8.1 },
];

const DB_COURSES = [
  { id:1, title:"ISO 9001:2015 Fundamentos",   category:"Calidad",      hours:16, instructor:"Ing. Fernández", status:"Activo" },
  { id:2, title:"Auditorías Internas",          category:"Calidad",      hours:12, instructor:"Dra. Morales",   status:"Activo" },
  { id:3, title:"Excel Avanzado",               category:"Herramientas", hours:8,  instructor:"Lic. Torres",    status:"Activo" },
  { id:4, title:"Comunicación Efectiva",        category:"Habilidades",  hours:6,  instructor:"Prof. Díaz",     status:"Activo" },
  { id:5, title:"Lean Six Sigma Green Belt",    category:"Calidad",      hours:40, instructor:"Ing. Ramírez",   status:"Activo" },
  { id:6, title:"Power BI para Reportes",       category:"Herramientas", hours:10, instructor:"Lic. Castillo",  status:"Activo" },
  { id:7, title:"Gestión de No Conformidades",  category:"Calidad",      hours:8,  instructor:"Ing. Fernández", status:"Activo" },
  { id:8, title:"Liderazgo de Equipos",         category:"Habilidades",  hours:12, instructor:"Prof. Díaz",     status:"Activo" },
];

const DB_TRAINING_PROGRESS = [
  { memberId:1, courseId:1, status:"Aprobado",  score:9.2 },
  { memberId:1, courseId:2, status:"Aprobado",  score:8.5 },
  { memberId:1, courseId:3, status:"En curso",  score:null },
  { memberId:1, courseId:5, status:"Aprobado",  score:9.8 },
  { memberId:2, courseId:1, status:"Aprobado",  score:8.0 },
  { memberId:2, courseId:4, status:"Aprobado",  score:7.5 },
  { memberId:2, courseId:5, status:"En curso",  score:null },
  { memberId:3, courseId:1, status:"Aprobado",  score:9.0 },
  { memberId:3, courseId:3, status:"Aprobado",  score:8.8 },
  { memberId:3, courseId:7, status:"Pendiente", score:null },
  { memberId:4, courseId:4, status:"Aprobado",  score:9.5 },
  { memberId:4, courseId:8, status:"Aprobado",  score:9.0 },
  { memberId:4, courseId:6, status:"Aprobado",  score:8.7 },
  { memberId:5, courseId:2, status:"Aprobado",  score:8.2 },
  { memberId:5, courseId:4, status:"En curso",  score:null },
  { memberId:5, courseId:6, status:"Pendiente", score:null },
  { memberId:6, courseId:3, status:"Aprobado",  score:7.9 },
  { memberId:6, courseId:4, status:"Aprobado",  score:8.4 },
  { memberId:6, courseId:8, status:"En curso",  score:null },
  { memberId:7, courseId:1, status:"Aprobado",  score:8.6 },
  { memberId:7, courseId:5, status:"Aprobado",  score:9.1 },
  { memberId:7, courseId:7, status:"Aprobado",  score:8.9 },
  { memberId:8, courseId:2, status:"Aprobado",  score:7.8 },
  { memberId:8, courseId:6, status:"En curso",  score:null },
  { memberId:8, courseId:3, status:"Pendiente", score:null },
];

// ── PARTIDOS MUNDIAL 2026 ─────────────────────────────────────
// known: true  → selección confirmada (muestra bandera)
// known: false → repechaje pendiente (muestra escudo gris)
// result: "" → no jugado | "1" local | "x" empate | "2" visita

const DB_MATCHES = [

  // ─── GRUPO A ───────────────────────────────────────────────
  { id:1,  group:"A", round:"Grupo A · Jornada 1", date:"Jue 11 Jun", time:"16:00", venue:"Estadio Azteca, CDMX",
    home:{ name:"México",     flag:"🇲🇽", known:true  },
    away:{ name:"Sudáfrica",  flag:"🇿🇦", known:true  }, result:"" },

  { id:2,  group:"A", round:"Grupo A · Jornada 1", date:"Jue 11 Jun", time:"23:00", venue:"Estadio Akron, Guadalajara",
    home:{ name:"Corea del Sur", flag:"🇰🇷", known:true  },
    away:{ name:"Rep. Checa",    flag:"🇨🇿", known:true  }, result:"" },

  { id:3,  group:"A", round:"Grupo A · Jornada 2", date:"Jue 18 Jun", time:"20:00", venue:"Mercedes-Benz, Atlanta",
    home:{ name:"Rep. Checa",  flag:"🇨🇿", known:true  },
    away:{ name:"Sudáfrica",   flag:"🇿🇦", known:true  }, result:"" },

  { id:4,  group:"A", round:"Grupo A · Jornada 2", date:"Jue 18 Jun", time:"22:00", venue:"Estadio Akron, Guadalajara",
    home:{ name:"México",     flag:"🇲🇽", known:true  },
    away:{ name:"Corea del Sur", flag:"🇰🇷", known:true  }, result:"" },

  { id:5,  group:"A", round:"Grupo A · Jornada 3", date:"Mié 24 Jun", time:"20:00", venue:"Estadio Azteca, CDMX",
    home:{ name:"Rep. Checa",    flag:"🇨🇿", known:true  },
    away:{ name:"México",        flag:"🇲🇽", known:true  }, result:"" },

  { id:6,  group:"A", round:"Grupo A · Jornada 3", date:"Mié 24 Jun", time:"20:00", venue:"Estadio BBVA, Monterrey",
    home:{ name:"Sudáfrica",  flag:"🇿🇦", known:true  },
    away:{ name:"Corea del Sur", flag:"🇰🇷", known:true }, result:"" },

  // ─── GRUPO B ───────────────────────────────────────────────
  { id:7,  group:"B", round:"Grupo B · Jornada 1", date:"Vie 12 Jun", time:"16:00", venue:"BMO Field, Toronto",
    home:{ name:"Canadá",   flag:"🇨🇦", known:true  },
    away:{ name:"Bosnia",   flag:"🇧🇦", known:true  }, result:"" },

  { id:8,  group:"B", round:"Grupo B · Jornada 1", date:"Sáb 13 Jun", time:"16:00", venue:"Levi's Stadium, San Francisco",
    home:{ name:"Qatar",   flag:"🇶🇦", known:true  },
    away:{ name:"Suiza",   flag:"🇨🇭", known:true  }, result:"" },

  { id:9,  group:"B", round:"Grupo B · Jornada 2", date:"Jue 18 Jun", time:"14:00", venue:"SoFi Stadium, Los Ángeles",
    home:{ name:"Suiza",  flag:"🇨🇭", known:true  },
    away:{ name:"Bosnia", flag:"🇧🇦", known:true  }, result:"" },

  { id:10, group:"B", round:"Grupo B · Jornada 2", date:"Jue 18 Jun", time:"17:00", venue:"BC Place, Vancouver",
    home:{ name:"Canadá", flag:"🇨🇦", known:true  },
    away:{ name:"Qatar",  flag:"🇶🇦", known:true  }, result:"" },

  { id:11, group:"B", round:"Grupo B · Jornada 3", date:"Mié 24 Jun", time:"16:00", venue:"Levi's Stadium, San Francisco",
    home:{ name:"Suiza",  flag:"🇨🇭", known:true  },
    away:{ name:"Canadá", flag:"🇨🇦", known:true  }, result:"" },

  { id:12, group:"B", round:"Grupo B · Jornada 3", date:"Mié 24 Jun", time:"16:00", venue:"Arrowhead, Kansas City",
    home:{ name:"Bosnia", flag:"🇧🇦", known:true  },
    away:{ name:"Qatar",  flag:"🇶🇦", known:true  }, result:"" },

  // ─── GRUPO C ───────────────────────────────────────────────
  { id:13, group:"C", round:"Grupo C · Jornada 1", date:"Sáb 13 Jun", time:"19:00", venue:"MetLife Stadium, Nueva Jersey",
    home:{ name:"Brasil",   flag:"🇧🇷", known:true  },
    away:{ name:"Marruecos",flag:"🇲🇦", known:true  }, result:"" },

  { id:14, group:"C", round:"Grupo C · Jornada 1", date:"Sáb 13 Jun", time:"22:00", venue:"Gillette Stadium, Boston",
    home:{ name:"Haití",   flag:"🇭🇹", known:true  },
    away:{ name:"Escocia", flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", known:true  }, result:"" },

  { id:15, group:"C", round:"Grupo C · Jornada 2", date:"Vie 19 Jun", time:"22:00", venue:"Hard Rock, Miami",
    home:{ name:"Brasil",  flag:"🇧🇷", known:true  },
    away:{ name:"Haití",   flag:"🇭🇹", known:true  }, result:"" },

  { id:16, group:"C", round:"Grupo C · Jornada 2", date:"Vie 19 Jun", time:"19:00", venue:"Lumen Field, Seattle",
    home:{ name:"Escocia",  flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", known:true  },
    away:{ name:"Marruecos",flag:"🇲🇦", known:true  }, result:"" },

  { id:17, group:"C", round:"Grupo C · Jornada 3", date:"Jue 25 Jun", time:"20:00", venue:"MetLife Stadium, Nueva Jersey",
    home:{ name:"Marruecos",flag:"🇲🇦", known:true  },
    away:{ name:"Haití",    flag:"🇭🇹", known:true  }, result:"" },

  { id:18, group:"C", round:"Grupo C · Jornada 3", date:"Jue 25 Jun", time:"20:00", venue:"Gillette Stadium, Boston",
    home:{ name:"Escocia", flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", known:true  },
    away:{ name:"Brasil",  flag:"🇧🇷", known:true  }, result:"" },

  // ─── GRUPO D ───────────────────────────────────────────────
  { id:19, group:"D", round:"Grupo D · Jornada 1", date:"Vie 12 Jun", time:"22:00", venue:"SoFi Stadium, Los Ángeles",
    home:{ name:"Estados Unidos", flag:"🇺🇸", known:true  },
    away:{ name:"Paraguay",       flag:"🇵🇾", known:true  }, result:"" },

  { id:20, group:"D", round:"Grupo D · Jornada 1", date:"Dom 14 Jun", time:"01:00", venue:"BC Place, Vancouver",
    home:{ name:"Australia", flag:"🇦🇺", known:true  },
    away:{ name:"Turquía",   flag:"🇹🇷", known:true  }, result:"" },

  { id:21, group:"D", round:"Grupo D · Jornada 2", date:"Vie 19 Jun", time:"16:00", venue:"AT&T Stadium, Dallas",
    home:{ name:"Estados Unidos", flag:"🇺🇸", known:true  },
    away:{ name:"Australia",      flag:"🇦🇺", known:true  }, result:"" },

  { id:22, group:"D", round:"Grupo D · Jornada 2", date:"Sáb 20 Jun", time:"01:00", venue:"Levi's Stadium, San Francisco",
    home:{ name:"Turquía",  flag:"🇹🇷", known:true  },
    away:{ name:"Paraguay", flag:"🇵🇾", known:true  }, result:"" },

  { id:23, group:"D", round:"Grupo D · Jornada 3", date:"Vie 26 Jun", time:"20:00", venue:"SoFi Stadium, Los Ángeles",
    home:{ name:"Paraguay",       flag:"🇵🇾", known:true  },
    away:{ name:"Australia",      flag:"🇦🇺", known:true  }, result:"" },

  { id:24, group:"D", round:"Grupo D · Jornada 3", date:"Vie 26 Jun", time:"20:00", venue:"Lumen Field, Seattle",
    home:{ name:"Turquía",        flag:"🇹🇷", known:true  },
    away:{ name:"Estados Unidos", flag:"🇺🇸", known:true  }, result:"" },

  // ─── GRUPO E ───────────────────────────────────────────────
  { id:25, group:"E", round:"Grupo E · Jornada 1", date:"Dom 14 Jun", time:"19:00", venue:"AT&T Stadium, Dallas",
    home:{ name:"Alemania",      flag:"🇩🇪", known:true  },
    away:{ name:"Costa de Marfil",flag:"🇨🇮", known:true  }, result:"" },

  { id:26, group:"E", round:"Grupo E · Jornada 1", date:"Dom 14 Jun", time:"22:00", venue:"Arrowhead, Kansas City",
    home:{ name:"Ecuador",  flag:"🇪🇨", known:true  },
    away:{ name:"Curazao",  flag:"🏳️", known:true  }, result:"" },

  { id:27, group:"E", round:"Grupo E · Jornada 2", date:"Sáb 20 Jun", time:"17:00", venue:"AT&T Stadium, Dallas",
    home:{ name:"Alemania",     flag:"🇩🇪", known:true  },
    away:{ name:"Ecuador",      flag:"🇪🇨", known:true  }, result:"" },

  { id:28, group:"E", round:"Grupo E · Jornada 2", date:"Sáb 20 Jun", time:"21:00", venue:"Lincoln Financial, Filadelfia",
    home:{ name:"Costa de Marfil",flag:"🇨🇮", known:true  },
    away:{ name:"Curazao",        flag:"🇨🇼", known:true  }, result:"" },

  { id:29, group:"E", round:"Grupo E · Jornada 3", date:"Vie 26 Jun", time:"20:00", venue:"Arrowhead, Kansas City",
    home:{ name:"Alemania",        flag:"🇩🇪", known:true  },
    away:{ name:"Curazao",         flag:"🇨🇼", known:true  }, result:"" },

  { id:30, group:"E", round:"Grupo E · Jornada 3", date:"Vie 26 Jun", time:"20:00", venue:"AT&T Stadium, Dallas",
    home:{ name:"Costa de Marfil", flag:"🇨🇮", known:true  },
    away:{ name:"Ecuador",         flag:"🇪🇨", known:true  }, result:"" },

  // ─── GRUPO F ───────────────────────────────────────────────
  { id:31, group:"F", round:"Grupo F · Jornada 1", date:"Dom 14 Jun", time:"16:00", venue:"Lincoln Financial, Filadelfia",
    home:{ name:"Países Bajos", flag:"🇳🇱", known:true  },
    away:{ name:"Japón",        flag:"🇯🇵", known:true  }, result:"" },

  { id:32, group:"F", round:"Grupo F · Jornada 1", date:"Lun 15 Jun", time:"01:00", venue:"Lumen Field, Seattle",
    home:{ name:"Túnez",  flag:"🇹🇳", known:true  },
    away:{ name:"Suecia", flag:"🇸🇪", known:true  }, result:"" },

  { id:33, group:"F", round:"Grupo F · Jornada 2", date:"Sáb 20 Jun", time:"14:00", venue:"Lincoln Financial, Filadelfia",
    home:{ name:"Países Bajos", flag:"🇳🇱", known:true  },
    away:{ name:"Túnez",        flag:"🇹🇳", known:true  }, result:"" },

  { id:34, group:"F", round:"Grupo F · Jornada 2", date:"Dom 21 Jun", time:"01:00", venue:"Lumen Field, Seattle",
    home:{ name:"Suecia", flag:"🇸🇪", known:true  },
    away:{ name:"Japón",  flag:"🇯🇵", known:true  }, result:"" },

  { id:35, group:"F", round:"Grupo F · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Gillette Stadium, Boston",
    home:{ name:"Japón",        flag:"🇯🇵", known:true  },
    away:{ name:"Túnez",        flag:"🇹🇳", known:true  }, result:"" },

  { id:36, group:"F", round:"Grupo F · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Lincoln Financial, Filadelfia",
    home:{ name:"Suecia",       flag:"🇸🇪", known:true  },
    away:{ name:"Países Bajos", flag:"🇳🇱", known:true  }, result:"" },

  // ─── GRUPO G ───────────────────────────────────────────────
  { id:37, group:"G", round:"Grupo G · Jornada 1", date:"Lun 15 Jun", time:"19:00", venue:"Hard Rock, Miami",
    home:{ name:"Bélgica",      flag:"🇧🇪", known:true  },
    away:{ name:"Nueva Zelanda",flag:"🇳🇿", known:true  }, result:"" },

  { id:38, group:"G", round:"Grupo G · Jornada 1", date:"Lun 15 Jun", time:"22:00", venue:"SoFi Stadium, Los Ángeles",
    home:{ name:"Egipto", flag:"🇪🇬", known:true  },
    away:{ name:"Irán",   flag:"🇮🇷", known:true  }, result:"" },

  { id:39, group:"G", round:"Grupo G · Jornada 2", date:"Dom 21 Jun", time:"16:00", venue:"Hard Rock, Miami",
    home:{ name:"Bélgica", flag:"🇧🇪", known:true  },
    away:{ name:"Irán",    flag:"🇮🇷", known:true  }, result:"" },
//hola cambio
  { id:40, group:"G", round:"Grupo G · Jornada 2", date:"Dom 21 Jun", time:"19:00", venue:"SoFi Stadium, Los Ángeles",
    home:{ name:"Egipto",       flag:"🇪🇬", known:true  },
    away:{ name:"Nueva Zelanda",flag:"🇳🇿", known:true  }, result:"" },

  { id:41, group:"G", round:"Grupo G · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Hard Rock, Miami",
    home:{ name:"Bélgica", flag:"🇧🇪", known:true  },
    away:{ name:"Egipto",  flag:"🇪🇬", known:true  }, result:"" },

  { id:42, group:"G", round:"Grupo G · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Lumen Field, Seattle",
    home:{ name:"Irán",         flag:"🇮🇷", known:true  },
    away:{ name:"Nueva Zelanda",flag:"🇳🇿", known:true  }, result:"" },

  // ─── GRUPO H ───────────────────────────────────────────────
  { id:43, group:"H", round:"Grupo H · Jornada 1", date:"Lun 15 Jun", time:"13:00", venue:"Mercedes-Benz, Atlanta",
    home:{ name:"España",    flag:"🇪🇸", known:true  },
    away:{ name:"Cabo Verde",flag:"🇨🇻", known:true  }, result:"" },

  { id:44, group:"H", round:"Grupo H · Jornada 1", date:"Lun 15 Jun", time:"22:00", venue:"Arrowhead, Kansas City",
    home:{ name:"Uruguay",      flag:"🇺🇾", known:true  },
    away:{ name:"Arabia Saudí", flag:"🇸🇦", known:true  }, result:"" },

  { id:45, group:"H", round:"Grupo H · Jornada 2", date:"Dom 21 Jun", time:"13:00", venue:"Mercedes-Benz, Atlanta",
    home:{ name:"España",       flag:"🇪🇸", known:true  },
    away:{ name:"Arabia Saudí", flag:"🇸🇦", known:true  }, result:"" },

  { id:46, group:"H", round:"Grupo H · Jornada 2", date:"Dom 21 Jun", time:"22:00", venue:"Arrowhead, Kansas City",
    home:{ name:"Uruguay",    flag:"🇺🇾", known:true  },
    away:{ name:"Cabo Verde", flag:"🇨🇻", known:true  }, result:"" },

  { id:47, group:"H", round:"Grupo H · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Estadio Akron, Guadalajara",
    home:{ name:"España",  flag:"🇪🇸", known:true  },
    away:{ name:"Uruguay", flag:"🇺🇾", known:true  }, result:"" },

  { id:48, group:"H", round:"Grupo H · Jornada 3", date:"Sáb 27 Jun", time:"20:00", venue:"Mercedes-Benz, Atlanta",
    home:{ name:"Cabo Verde",   flag:"🇨🇻", known:true  },
    away:{ name:"Arabia Saudí", flag:"🇸🇦", known:true  }, result:"" },

  // ─── GRUPO I ───────────────────────────────────────────────
  { id:49, group:"I", round:"Grupo I · Jornada 1", date:"Mar 16 Jun", time:"16:00", venue:"MetLife Stadium, Nueva Jersey",
    home:{ name:"Francia",  flag:"🇫🇷", known:true  },
    away:{ name:"Senegal",  flag:"🇸🇳", known:true  }, result:"" },

  { id:50, group:"I", round:"Grupo I · Jornada 1", date:"Mar 16 Jun", time:"19:00", venue:"Arrowhead, Kansas City",
    home:{ name:"Irak",    flag:"🇮🇶", known:true  },
    away:{ name:"Noruega", flag:"🇳🇴", known:true  }, result:"" },

  { id:51, group:"I", round:"Grupo I · Jornada 2", date:"Lun 22 Jun", time:"18:00", venue:"MetLife Stadium, Nueva Jersey",
    home:{ name:"Francia", flag:"🇫🇷", known:true  },
    away:{ name:"Irak",    flag:"🇮🇶", known:true  }, result:"" },

  { id:52, group:"I", round:"Grupo I · Jornada 2", date:"Lun 22 Jun", time:"21:00", venue:"Hard Rock, Miami",
    home:{ name:"Noruega", flag:"🇳🇴", known:true  },
    away:{ name:"Senegal", flag:"🇸🇳", known:true  }, result:"" },

  { id:53, group:"I", round:"Grupo I · Jornada 3", date:"Dom 27 Jun", time:"20:00", venue:"MetLife Stadium, Nueva Jersey",
    home:{ name:"Senegal", flag:"🇸🇳", known:true  },
    away:{ name:"Irak",    flag:"🇮🇶", known:true  }, result:"" },

  { id:54, group:"I", round:"Grupo I · Jornada 3", date:"Dom 27 Jun", time:"20:00", venue:"AT&T Stadium, Dallas",
    home:{ name:"Noruega", flag:"🇳🇴", known:true  },
    away:{ name:"Francia", flag:"🇫🇷", known:true  }, result:"" },

  // ─── GRUPO J ───────────────────────────────────────────────
  { id:55, group:"J", round:"Grupo J · Jornada 1", date:"Mar 16 Jun", time:"22:00", venue:"Arrowhead, Kansas City",
    home:{ name:"Argentina", flag:"🇦🇷", known:true  },
    away:{ name:"Argelia",   flag:"🇩🇿", known:true  }, result:"" },

  { id:56, group:"J", round:"Grupo J · Jornada 1", date:"Mar 16 Jun", time:"01:00", venue:"Lumen Field, Seattle",
    home:{ name:"Austria",  flag:"🇦🇹", known:true  },
    away:{ name:"Jordania", flag:"🇯🇴", known:true  }, result:"" },

  { id:57, group:"J", round:"Grupo J · Jornada 2", date:"Lun 22 Jun", time:"14:00", venue:"AT&T Stadium, Dallas",
    home:{ name:"Argentina", flag:"🇦🇷", known:true  },
    away:{ name:"Austria",   flag:"🇦🇹", known:true  }, result:"" },

  { id:58, group:"J", round:"Grupo J · Jornada 2", date:"Lun 22 Jun", time:"00:00", venue:"Lumen Field, Seattle",
    home:{ name:"Jordania", flag:"🇯🇴", known:true  },
    away:{ name:"Argelia",  flag:"🇩🇿", known:true  }, result:"" },

  { id:59, group:"J", round:"Grupo J · Jornada 3", date:"Sáb 27 Jun", time:"23:00", venue:"Arrowhead, Kansas City",
    home:{ name:"Jordania",  flag:"🇯🇴", known:true  },
    away:{ name:"Argentina", flag:"🇦🇷", known:true  }, result:"" },

  { id:60, group:"J", round:"Grupo J · Jornada 3", date:"Sáb 27 Jun", time:"23:00", venue:"AT&T Stadium, Dallas",
    home:{ name:"Argelia", flag:"🇩🇿", known:true  },
    away:{ name:"Austria", flag:"🇦🇹", known:true  }, result:"" },

  // ─── GRUPO K ───────────────────────────────────────────────
  { id:61, group:"K", round:"Grupo K · Jornada 1", date:"Mié 17 Jun", time:"14:00", venue:"NRG Stadium, Houston",
    home:{ name:"Portugal",  flag:"🇵🇹", known:true  },
    away:{ name:"Rep. D. Congo",flag:"🇨🇩", known:true  }, result:"" },

  { id:62, group:"K", round:"Grupo K · Jornada 1", date:"Mié 17 Jun", time:"23:00", venue:"Hard Rock, Miami",
    home:{ name:"Uzbekistán", flag:"🇺🇿", known:true  },
    away:{ name:"Colombia",   flag:"🇨🇴", known:true  }, result:"" },

  { id:63, group:"K", round:"Grupo K · Jornada 2", date:"Mar 23 Jun", time:"14:00", venue:"NRG Stadium, Houston",
    home:{ name:"Portugal",   flag:"🇵🇹", known:true  },
    away:{ name:"Uzbekistán", flag:"🇺🇿", known:true  }, result:"" },

  { id:64, group:"K", round:"Grupo K · Jornada 2", date:"Mar 23 Jun", time:"23:00", venue:"Hard Rock, Miami",
    home:{ name:"Colombia",      flag:"🇨🇴", known:true  },
    away:{ name:"Rep. D. Congo", flag:"🇨🇩", known:true  }, result:"" },

  { id:65, group:"K", round:"Grupo K · Jornada 3", date:"Dom 27 Jun", time:"20:00", venue:"NRG Stadium, Houston",
    home:{ name:"Colombia",  flag:"🇨🇴", known:true  },
    away:{ name:"Portugal",  flag:"🇵🇹", known:true  }, result:"" },

  { id:66, group:"K", round:"Grupo K · Jornada 3", date:"Dom 27 Jun", time:"20:00", venue:"Lincoln Financial, Filadelfia",
    home:{ name:"Rep. D. Congo", flag:"🇨🇩", known:true  },
    away:{ name:"Uzbekistán",    flag:"🇺🇿", known:true  }, result:"" },

  // ─── GRUPO L ───────────────────────────────────────────────
  { id:67, group:"L", round:"Grupo L · Jornada 1", date:"Mié 17 Jun", time:"17:00", venue:"AT&T Stadium, Dallas",
    home:{ name:"Inglaterra", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", known:true  },
    away:{ name:"Croacia",    flag:"🇭🇷", known:true  }, result:"" },

  { id:68, group:"L", round:"Grupo L · Jornada 1", date:"Mié 17 Jun", time:"20:00", venue:"BMO Field, Toronto",
    home:{ name:"Ghana",  flag:"🇬🇭", known:true  },
    away:{ name:"Panamá", flag:"🇵🇦", known:true  }, result:"" },

  { id:69, group:"L", round:"Grupo L · Jornada 2", date:"Mar 23 Jun", time:"17:00", venue:"AT&T Stadium, Dallas",
    home:{ name:"Inglaterra", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", known:true  },
    away:{ name:"Ghana",      flag:"🇬🇭", known:true  }, result:"" },

  { id:70, group:"L", round:"Grupo L · Jornada 2", date:"Mar 23 Jun", time:"20:00", venue:"Lincoln Financial, Filadelfia",
    home:{ name:"Panamá",  flag:"🇵🇦", known:true  },
    away:{ name:"Croacia", flag:"🇭🇷", known:true  }, result:"" },

  { id:71, group:"L", round:"Grupo L · Jornada 3", date:"Sáb 27 Jun", time:"18:00", venue:"Lincoln Financial, Filadelfia",
    home:{ name:"Panamá",     flag:"🇵🇦", known:true  },
    away:{ name:"Inglaterra", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", known:true  }, result:"" },

  { id:72, group:"L", round:"Grupo L · Jornada 3", date:"Sáb 27 Jun", time:"18:00", venue:"BMO Field, Toronto",
    home:{ name:"Croacia", flag:"🇭🇷", known:true  },
    away:{ name:"Ghana",   flag:"🇬🇭", known:true  }, result:"" },
];

// Grupos únicos para filtro
const DB_MATCH_GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

const DB_NEWS = [
  { id:8, title:"Se perdio un tupper en el 2do de Agustin Pereyra", body:"Todos los supervisores y operadores a buscar el tupper", category:"Calidad",      emoji:"✅", author:"Marcos Tornesse", date:"21 Abr 2026" },
  { id:7, title:"Inscripciones a capacitación",                     body:"Jueves de capacitación, hay medialunas",                 category:"Capacitación", emoji:"🗣️", author:"Enzo Aguirre",   date:"22 Abr 2026" },
  { id:6, title:"Viernes de dinamica",                              body:"Dia de la empanada Australiana",                        category:"Gestión",      emoji:"📋", author:"Laura Gómez",    date:"23 Abr 2026" },
  { id:5, title:"Score Balance",                                    body:"Venimos atrasadisimos estamos al horno",                 category:"Calidad",      emoji:"⭐", author:"Ana López",      date:"24 Abr 2026" },
];

const DB_ACTIVITY = [
  { color:"green", message:"Auditorías al día",                            time:"28 Abr · 09:05" },
  { color:"blue",  message:"Enzo Aguirre completó Liderazgo de Equipos.", time:"27 Abr · 15:00" },
  { color:"amber", message:"Score Balance Atrasado",                       time:"26 Abr · 11:30" },
  { color:"red",   message:"¡Cargá tu prode antes del 11 de junio!",      time:"25 Abr · 10:10" },
  { color:"green", message:"Cuiden sus tuppers",                           time:"24 Abr · 09:00" },
];