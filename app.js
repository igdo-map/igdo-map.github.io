document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Inicializar el mapa
    const map = L.map('map').setView([-38.416097, -63.616672], 5);

    L.tileLayer('https://maptiles.p.rapidapi.com/es/map/v1/{z}/{x}/{y}.png?rapidapi-key=0501f3f404msh0d6c6801fc089a8p1bbb94jsn87f86fde6155', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.maptilesapi.com/">MapTiles API</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Icons personalizados
    const iconIG = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const iconDO = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // Estado global de los datos y capas
    let allPoints = []; 
    const treeData = {
        IG: { checked: true, expanded: false, provinces: {} },
        DO: { checked: true, expanded: false, provinces: {} }
    };

    // 2. Control personalizado Leaflet para el Panel Flotante
    const filterControl = L.control({ position: 'topright' });

    filterControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'filter-panel');
        // Previene que los clicks o scroll en el panel muevan el mapa
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        div.id = 'filter-panel-content';
        return div;
    };
    filterControl.addTo(map);

    // 3. Carga del CSV mediante PapaParse
    Papa.parse("datos.csv", {
        download: true,
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        encoding: "UTF-8",
        complete: function(results) {
            
            results.data.forEach(item => {
                const lat = parseFloat(item.lat);
                const lng = parseFloat(item.long);

                if (!isNaN(lat) && !isNaN(lng)) {
                    const sello = item.tiposello ? item.tiposello.trim() : '';
                    const prov = item.provincia ? item.provincia.trim() : 'Sin Provincia';

                    if (sello === 'IG' || sello === 'DO') {
                        const markerIcon = (sello === 'DO') ? iconDO : iconIG;
                        const badgeClass = (sello === 'DO') ? 'badge-do' : 'badge-ig';

                        const marker = L.marker([lat, lng], { icon: markerIcon });
                        
                        const popupContent = `
                            <div class="popup-container">
                                <span class="badge ${badgeClass}">${sello}</span>
                                <h3>${item.nombre}</h3>
                                <p><strong>Provincia:</strong> ${prov}</br>
                                <strong>Zona:</strong> ${item.zona}</br>
                                <strong>Resolución:</strong> ${item.resolucion}</br>
                                <strong>Referencia:</strong> ${item.referencia}</p>
                                <img src="logos/${item.ID}.jpg" alt="${item.nombre}" onerror="this.style.display='none';">
                            </div>
                        `;
                        marker.bindPopup(popupContent);

                        const pointObj = {
                            sello: sello,
                            provincia: prov,
                            marker: marker
                        };

                        allPoints.push(pointObj);

                        // Registrar jerarquía de datos
                        if (!(prov in treeData[sello].provinces)) {
                            treeData[sello].provinces[prov] = true; 
                        }
                    }
                }
            });

            // Dibujar panel e inicializar visibilidad de marcadores
            renderPanel();
            applyFilters();
        },
        error: function(err) {
            console.error("Error al cargar el CSV:", err);
        }
    });

    // 4. Renderizado dinámico del panel UI
    function renderPanel() {
        const container = document.getElementById('filter-panel-content');
        let html = `<div class="panel-header">Sellos</div>`;

        ['IG', 'DO'].forEach(sello => {
            const isChecked = treeData[sello].checked;
            const isExpanded = treeData[sello].expanded;
            const toggleSymbol = isExpanded ? '-' : '+';
            const displayStyle = isExpanded ? 'block' : 'none';

            html += `
                <div class="seal-item">
                    <div class="seal-row">
                        <span class="toggle-btn" onclick="window.toggleExpand('${sello}')">${toggleSymbol}</span>
                        <input type="checkbox" id="chk-${sello}" ${isChecked ? 'checked' : ''} onchange="window.toggleSeal('${sello}', this.checked)">
                        <label for="chk-${sello}"><strong>${sello}</strong></label>
                    </div>
                    <div class="province-list" style="display: ${displayStyle};">
            `;

            // Listar provincias de este sello
            const provKeys = Object.keys(treeData[sello].provinces).sort();
            provKeys.forEach(prov => {
                const provChecked = treeData[sello].provinces[prov];
                const provId = `chk-${sello}-${prov.replace(/\s+/g, '_')}`;

                html += `
                    <div class="province-row">
                        <input type="checkbox" id="${provId}" ${provChecked ? 'checked' : ''} onchange="window.toggleProvince('${sello}', '${prov}', this.checked)">
                        <label for="${provId}">${prov}</label>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // 5. Métodos de interacción (Expuestos al objeto window)
    window.toggleExpand = function(sello) {
        treeData[sello].expanded = !treeData[sello].expanded;
        renderPanel();
    };

    window.toggleSeal = function(sello, isChecked) {
        treeData[sello].checked = isChecked;
        
        // Sincronizar todas las provincias dependientes
        Object.keys(treeData[sello].provinces).forEach(prov => {
            treeData[sello].provinces[prov] = isChecked;
        });

        renderPanel();
        applyFilters();
    };

    window.toggleProvince = function(sello, prov, isChecked) {
        treeData[sello].provinces[prov] = isChecked;

        // Si al menos una provincia queda marcada, mantenemos el sello activado, de lo contrario lo desmarcamos
        const anyChecked = Object.values(treeData[sello].provinces).some(val => val === true);
        treeData[sello].checked = anyChecked;

        renderPanel();
        applyFilters();
    };

    // 6. Aplicar estado visual a los marcadores en el mapa
    function applyFilters() {
        allPoints.forEach(pt => {
            const isSealActive = treeData[pt.sello].checked;
            const isProvActive = treeData[pt.sello].provinces[pt.provincia];

            // Un punto es visible si el sello Y su provincia específica están seleccionados
            if (isSealActive && isProvActive) {
                if (!map.hasLayer(pt.marker)) {
                    map.addLayer(pt.marker);
                }
            } else {
                if (map.hasLayer(pt.marker)) {
                    map.removeLayer(pt.marker);
                }
            }
        });
    }
});