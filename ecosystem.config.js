module.exports = {
    apps: [
        {
            name: 'docente-v1',
            script: 'index.js',
            env: {
                PORT: 3065,
                HOST: '192.168.1.100',
                USER: 'portaldocenteuser',
                PSW: 'tribicuche',
                DB: 'portaldocente',
                DBPORT: 3306,
                JWT_SECRET: 'tokenSecret',
                JWT_TOKEN_USO: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3IiwibmFtZSI6IlBvcnRhbCBEb2NlbnRlcyIsInZlcnNpb24iOiIxLjAuMCIsImlhdCI6MTUxNjIzOTAyMn0.izYqHqAfz38Joh2Cco-SHDFgjddSjDZmeVwGajWVcVA',
                API_ENDPOINT: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/planificacion',
                API_ENDPOINT_STUDENTS: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/planificacion',
                API_REPORTE_ASISTENCIA: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/reporteAsistencia',
                API_NOTAS: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/notas',
                API_DOCENTES: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/docentes',
                API_DECANOS: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/Decanos',
                API_GESTION_CUADRO_NOTA_MODO: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/gestionCuadroNota',
                API_SISTEMA_CONFIGURACION: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/sistemaConfiguracion',
                API_TASA_APROBACION: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/tasaAprobacion',
                API_TASA_APROBACION_GRUPO: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/tasaAprobacionGrupo',
                API_ESTUDIANTES_SOLVENTES: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/estudiantesSolventes',
                API_LANZAMIENTOS: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/evaluacionLanzamiento',
                API_DATA_GESTION_CUADRO_NOTA: 'http://190.242.151.89:3005/krakatoa/v1/portaldocentes/dataGestionCuadroNota',
                API_HOST: '190.242.151.89',
                API_PORT: 3005,
                API_PATH: '/krakatoa/v1/portaldocentes/login',
                MAINTENANCE_MODE: false,
            }
        },
    ]
}