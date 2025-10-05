'use strict';

// ----------------------------------------------------------------------
// 1. VARIABLES GLOBALES (Definidas en el scope de window para modularidad)
// ----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {

    const NUM_MAX_JUGADORES = 50; 
    
    // Variables que se sincronizarán con localStorage y otros módulos
    window.jugadores = []; 
    window.jugadorActualIndex = 1; 
    window.jugadoresEnJuego = []; 
    window.parejasEnJuego = []; 
    window.configPartida = null;
    window.puestosAsignados = 0; 
    window.turnoActual = 0; 
    window.rondaActual = 1;
    window.modoJuego = null;
    window.modalidadLanzamiento = null; 

    // ====================================================================
    // 2. LÓGICA DE INICIO Y SELECCIÓN DE MODO (index.html, modo_juego.html)
    // ====================================================================
    
    const botonEmpezar = document.getElementById('botonEmpezar');
    if (botonEmpezar) {
        botonEmpezar.addEventListener('click', function() {
            window.location.href = 'modo_juego.html'; 
        });
    }

    const tarjetasModo = document.querySelectorAll('.tarjeta-modo');
    tarjetasModo.forEach(tarjeta => {
        tarjeta.addEventListener('click', function() {
            const modoElegido = tarjeta.getAttribute('data-modo'); 
            
            // Limpieza COMPLETA de estado anterior (IMPORTANTE)
            ['configPartida', 'jugadoresOrdenados', 'jugadoresEnJuegoActual', 'ganadores', 'puestosAsignados', 'turnoActual', 'rondaActual', 'parejasEnJuego', 'modalidadLanzamiento', 'modoJuego'].forEach(key => {
                localStorage.removeItem(key);
            });

            // Guardar el modo y redirigir
            localStorage.setItem('modoJuego', modoElegido);
            
            if (modoElegido === 'individual') {
                window.location.href = 'juego_individual.html'; 
            } else if (modoElegido === 'equipo') {
                window.location.href = 'pantalla_nombres.html';
            }
        });
    });

    // ====================================================================
    // 3. LÓGICA DE CONFIGURACIÓN INDIVIDUAL (juego_individual.html)
    // ====================================================================

    const formIndividual = document.getElementById('formConfiguracionIndividual');
    const numPuestosInput = document.getElementById('numPuestos');
    const numJugadoresInput = document.getElementById('numJugadores');
    const puntajeMaximoInput = document.getElementById('puntajeMaximo'); 
    const contenedorPremios = document.getElementById('contenedorPremios');

    if (formIndividual) {
        numJugadoresInput.max = NUM_MAX_JUGADORES;
        numPuestosInput.max = NUM_MAX_JUGADORES; 
        
        if (puntajeMaximoInput) {
            puntajeMaximoInput.value = ''; 
        }

        function generarCamposPremios() {
            const numPuestos = parseInt(numPuestosInput.value) || 0;
            const numJugadores = parseInt(numJugadoresInput.value) || 0;

            if (numPuestos > 0 && numJugadores > 0 && numPuestos > numJugadores) {
                numPuestosInput.setCustomValidity(`Los puestos ganadores no pueden exceder la cantidad de jugadores (${numJugadores}).`);
                numPuestosInput.reportValidity();
                contenedorPremios.innerHTML = '';
                return;
            } else {
                numPuestosInput.setCustomValidity(''); 
            }
            
            let htmlPremios = '';
            if (numPuestos > 0) {
                htmlPremios += '<h3>Asignación de Premios</h3>';
                for (let i = 1; i <= numPuestos; i++) {
                    const sufijo = i === 1 ? 'er' : (i === 3 ? 'er' : 'to');
                    htmlPremios += `
                        <div class="input-group">
                            <label for="premio-${i}">Premio ${i}${sufijo} Puesto:</label>
                            <input type="number" 
                                        id="premio-${i}" 
                                        name="premio-${i}" 
                                        placeholder="Valor del premio (Ej. 5000)" 
                                        min="0"
                                        required 
                                        class="input-premio">
                        </div>
                    `;
                }
            }
            contenedorPremios.innerHTML = htmlPremios;
        }

        numJugadoresInput.addEventListener('input', generarCamposPremios);
        numPuestosInput.addEventListener('input', generarCamposPremios);

        formIndividual.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            if (!formIndividual.checkValidity()) {
                alert('Por favor, completa todos los campos requeridos y revisa las validaciones.');
                return;
            }

            const numJ = parseInt(numJugadoresInput.value);
            const puestos = parseInt(numPuestosInput.value);
            const puntajeMaximo = parseInt(puntajeMaximoInput.value); 
            const premios = {};

            if (puestos > numJ) {
                 numPuestosInput.setCustomValidity(`Los puestos ganadores no pueden exceder la cantidad de jugadores (${numJ}).`);
                 numPuestosInput.reportValidity();
                 return;
            }

            for (let i = 1; i <= puestos; i++) {
                const inputPremio = document.getElementById(`premio-${i}`);
                if (inputPremio) {
                    premios[i] = parseInt(inputPremio.value) || 0;
                }
            }

            const configuracion = {
                modo: 'individual',
                numJugadores: numJ,
                puntajeObjetivo: puntajeMaximo, 
                puestosGanadores: puestos,
                premios: premios
            };

            localStorage.setItem('configPartida', JSON.stringify(configuracion));
            
            window.location.href = 'pantalla_nombres.html'; 
        });
        
        generarCamposPremios(); 
    }

});