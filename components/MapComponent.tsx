import React, { useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, MapRef, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  popupContent?: React.ReactNode;
  color?: string;
  icon?: React.ReactNode;
}

export interface MapRoute {
  id: string;
  coordinates: [number, number][]; // [lng, lat] format for Mapbox GeoJSON
  color?: string;
  weight?: number;
}

interface MapComponentProps {
  center: { lat: number; lng: number };
  zoom?: number;
  height?: string | number;
  interactive?: boolean;
  markers?: MapMarker[];
  routes?: MapRoute[];
  children?: React.ReactNode;
  onMarkerClick?: (id: string) => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom = 15,
  height = '100%',
  interactive = true,
  markers = [],
  routes = [],
  children,
  onMarkerClick,
}) => {
  const mapRef = useRef<MapRef>(null);

  // Sync map center when props change
  useEffect(() => {
    if (mapRef.current && center.lat && center.lng) {
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        duration: 2000,
        zoom: zoom
      });
    }
  }, [center.lat, center.lng, zoom]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest p-8 text-center">
        Token do Mapbox não configurado
      </div>
    );
  }

  // Se não houver coordenadas, mostramos um estado vazio
  if (!center.lat && !center.lng && markers.length === 0) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest px-8 text-center">
        Aguardando Localização...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: center.lng || (markers[0]?.lng || -47.8825),
          latitude: center.lat || (markers[0]?.lat || -15.7942),
          zoom: zoom
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        scrollZoom={interactive}
        attributionControl={false}
      >
        <FullscreenControl position="top-right" />
        <NavigationControl position="top-right" />
        
        {/* Draw Routes */}
        {routes.map(route => (
          <Source key={route.id} type="geojson" data={{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: route.coordinates
            }
          }}>
            <Layer
              id={route.id}
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-color': route.color || '#2563eb',
                'line-width': route.weight || 4,
                'line-opacity': 0.75
              }}
            />
          </Source>
        ))}

        {/* Dynamic Markers */}
        {markers.map(marker => (
          <React.Fragment key={marker.id}>
            <Marker
              longitude={marker.lng}
              latitude={marker.lat}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation();
                onMarkerClick?.(marker.id);
              }}
            >
              {marker.icon || (
                <div 
                  className="cursor-pointer transition-transform hover:scale-110"
                  style={{ color: marker.color || '#ef4444' }}
                >
                  <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 40 15 40C15 40 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.625C11.8934 20.625 9.375 18.1066 9.375 15C9.375 11.8934 11.8934 9.375 15 9.375C18.1066 9.375 20.625 11.8934 20.625 15C20.625 18.1066 18.1066 20.625 15 20.625Z" fill="currentColor"/>
                  </svg>
                </div>
              )}
            </Marker>
            {marker.popupContent && (
              <Popup
                longitude={marker.lng}
                latitude={marker.lat}
                anchor="top"
                onClose={() => {}}
                closeButton={false}
                className="rounded-xl overflow-hidden shadow-xl z-50 pointer-events-none"
              >
                {marker.popupContent}
              </Popup>
            )}
          </React.Fragment>
        ))}

        {/* Support for direct react-map-gl children (Markers, Popups, etc.) */}
        {children}

        {/* Classic single marker fallback for backward compatibility */}
        {!markers.length && center.lat && center.lng && (
          <Marker
            longitude={center.lng}
            latitude={center.lat}
            anchor="bottom"
            color="var(--primary-color, #ef4444)"
          />
        )}
      </Map>
    </div>
  );
};
