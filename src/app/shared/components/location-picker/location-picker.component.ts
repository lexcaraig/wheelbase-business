import {
  Component,
  EventEmitter,
  Input,
  Output,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

// Fix for default marker icons in Leaflet with Angular
const iconRetinaUrl = 'assets/leaflet/marker-icon-2x.png';
const iconUrl = 'assets/leaflet/marker-icon.png';
const shadowUrl = 'assets/leaflet/marker-shadow.png';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="location-picker">
      <div class="map-container" [id]="mapId"></div>
      @if (selectedLocation) {
        <div class="selected-coords">
          📍 {{ selectedLocation.lat.toFixed(6) }}, {{ selectedLocation.lng.toFixed(6) }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      .location-picker {
        width: 100%;
      }
      .map-container {
        height: 300px;
        width: 100%;
        border-radius: 8px;
        border: 1px solid oklch(var(--b3));
        z-index: 0;
      }
      .selected-coords {
        margin-top: 8px;
        padding: 8px 12px;
        background: oklch(var(--b3));
        border-radius: 6px;
        font-size: 14px;
        color: oklch(var(--bc));
      }
    `,
  ],
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  private elementRef = inject(ElementRef);

  @Input() initialLocation?: { lat: number; lng: number };
  @Output() locationSelected = new EventEmitter<{ lat: number; lng: number }>();

  private map?: L.Map;
  private marker?: L.Marker;
  selectedLocation?: { lat: number; lng: number };

  // Unique ID for the map container to avoid conflicts
  mapId = 'map-' + Math.random().toString(36).substring(2, 9);

  // Default center: Philippines (Manila)
  private defaultCenter: L.LatLngExpression = [14.5995, 120.9842];
  private defaultZoom = 12;

  ngAfterViewInit(): void {
    // Small delay to ensure the container is rendered
    setTimeout(() => this.initMap(), 100);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    const container = this.elementRef.nativeElement.querySelector(`#${this.mapId}`);
    if (!container) {
      console.error('Map container not found');
      return;
    }

    const center = this.initialLocation
      ? ([this.initialLocation.lat, this.initialLocation.lng] as L.LatLngExpression)
      : this.defaultCenter;

    this.map = L.map(container).setView(center, this.defaultZoom);

    // OpenStreetMap tiles (free, no API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Add initial marker if location provided
    if (this.initialLocation) {
      this.addMarker(this.initialLocation.lat, this.initialLocation.lng);
      this.selectedLocation = this.initialLocation;
    }

    // Click handler to place/move marker
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.addMarker(e.latlng.lat, e.latlng.lng);
      this.selectedLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
      this.locationSelected.emit(this.selectedLocation);
    });
  }

  private addMarker(lat: number, lng: number): void {
    if (!this.map) return;

    // Create custom icon using default Leaflet marker but with CDN fallback
    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
    }
  }
}
