// middleware/logger.js

const logger = (req, res, next) => {
    const fecha = new Date().toLocaleString();
    const metodo = req.method;
    const url = req.url;

    console.log(`[${fecha}] Solicitud ${metodo} a la ruta: ${url}`);
    
    next();
};

module.exports = logger;