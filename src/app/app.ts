import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private apiUrl = 'http://localhost:3000/api/agriculture';
  private cropsApiUrl = 'http://localhost:3000/api/crops-db';
  private settingsApiUrl = 'http://localhost:3000/api/settings';
  private authApiUrl = 'http://localhost:3000/api/auth';

  // Authentication
  authMode: 'login' | 'signup' = 'login';
  isLoggedIn = false;
  currentUser: any = null;
  authLoading = false;
  authError = '';
  authSuccess = '';
  showPassword = false;

  authForm = {
    name: '',
    email: '',
    password: '',
  };

  // Dashboard data
  crops: any[] = [];

  soil: any = {
    type: 'Loamy',
    moisture: 45,
    ph: 6.5,
  };

  weather: any = {
    temperature: 28,
    humidity: 65,
    rainfall: 0,
  };

  irrigation: any = {
    status: 'Automatic',
    waterUsage: 120,
    unit: 'litres',
  };

  // Editable settings
  soilTypes: string[] = ['Loamy', 'Clay', 'Sandy', 'Silty', 'Peaty', 'Chalky'];

  irrigationOptions: string[] = ['Automatic', 'Manual', 'On', 'Off'];

  settingsMessage = '';
  settingsSaving = false;

  // Crop registration
  cropForm = {
    name: '',
    season: 'Kharif',
    area: 1,
    status: 'Growing',
  };

  // Crop guidance is based on the crop name entered in the crop form.
  // These are general starting recommendations, not a soil test or live sensor readings.
  get cropRecommendation(): {
    crop: string;
    soil: string;
    ph: string;
    water: string;
    notes: string;
  } | null {
    const name = (this.cropForm.name || '').trim().toLowerCase();

    const recommendations: Record<string, {
      crop: string;
      soil: string;
      ph: string;
      water: string;
      notes: string;
    }> = {
      rice: {
        crop: 'Rice',
        soil: 'Clayey or clay-loam soil that can retain water.',
        ph: 'About 5.5–6.5 is commonly suitable.',
        water: 'High water requirement; manage irrigation based on growth stage and rainfall.',
        notes: 'Avoid assuming the field must stay continuously flooded; local practices and variety matter.',
      },
      paddy: {
        crop: 'Rice (paddy)',
        soil: 'Clayey or clay-loam soil that can retain water.',
        ph: 'About 5.5–6.5 is commonly suitable.',
        water: 'High water requirement; manage irrigation based on growth stage and rainfall.',
        notes: 'Local variety, field leveling and water availability affect the recommendation.',
      },
      wheat: {
        crop: 'Wheat',
        soil: 'Well-drained loam or clay-loam soil.',
        ph: 'Around 6.0–7.5 is often suitable.',
        water: 'Moderate water requirement; avoid waterlogging and irrigate at important growth stages.',
        notes: 'Sowing time and local climate strongly affect performance.',
      },
      maize: {
        crop: 'Maize',
        soil: 'Well-drained loam or sandy-loam soil.',
        ph: 'Around 5.5–7.0 is often suitable.',
        water: 'Moderate water requirement; avoid water stress around flowering and grain filling.',
        notes: 'Provide good drainage and adjust irrigation to rainfall.',
      },
      corn: {
        crop: 'Maize (corn)',
        soil: 'Well-drained loam or sandy-loam soil.',
        ph: 'Around 5.5–7.0 is often suitable.',
        water: 'Moderate water requirement; avoid water stress around flowering and grain filling.',
        notes: 'Provide good drainage and adjust irrigation to rainfall.',
      },
      cotton: {
        crop: 'Cotton',
        soil: 'Deep, well-drained loam or black cotton soil where locally suitable.',
        ph: 'Approximately 5.8–8.0 can be suitable depending on soil and variety.',
        water: 'Moderate seasonal water requirement; avoid both water stress and waterlogging.',
        notes: 'Variety, local rainfall and pest management are important.',
      },
      tomato: {
        crop: 'Tomato',
        soil: 'Fertile, well-drained loam rich in organic matter.',
        ph: 'Around 5.5–7.0 is commonly suitable.',
        water: 'Regular, even moisture is important; avoid waterlogging and wetting foliage excessively.',
        notes: 'Support, nutrient management and disease prevention may be needed.',
      },
      potato: {
        crop: 'Potato',
        soil: 'Loose, well-drained sandy-loam or loam soil.',
        ph: 'Around 5.0–6.5 is commonly suitable.',
        water: 'Keep soil evenly moist, especially during tuber formation, without waterlogging.',
        notes: 'Use healthy seed tubers and suitable local varieties.',
      },
      sugarcane: {
        crop: 'Sugarcane',
        soil: 'Deep, fertile, well-drained loam or clay-loam soil.',
        ph: 'Around 6.0–7.5 is often suitable.',
        water: 'High seasonal water requirement; schedule irrigation according to rainfall and growth.',
        notes: 'Crop duration and local water availability need to be considered.',
      },
      groundnut: {
        crop: 'Groundnut',
        soil: 'Loose, well-drained sandy-loam soil.',
        ph: 'Around 5.5–7.0 is commonly suitable.',
        water: 'Moderate water requirement; avoid waterlogging, especially during pegging and pod development.',
        notes: 'Calcium availability and soil drainage are important.',
      },
      chilli: {
        crop: 'Chilli',
        soil: 'Well-drained loam or sandy-loam soil.',
        ph: 'Around 6.0–7.0 is commonly suitable.',
        water: 'Moderate, consistent moisture; avoid waterlogging.',
        notes: 'Local variety and disease pressure affect crop management.',
      },
      soybean: {
        crop: 'Soybean',
        soil: 'Well-drained loam or clay-loam soil.',
        ph: 'Around 6.0–7.0 is commonly suitable.',
        water: 'Moderate water requirement; avoid waterlogging and moisture stress during flowering and pod filling.',
        notes: 'Use suitable inoculated seed where recommended locally.',
      },
      millet: {
        crop: 'Millets',
        soil: 'Well-drained soil; many millet types tolerate lighter soils.',
        ph: 'Varies by millet type; confirm the local variety recommendation.',
        water: 'Often lower water requirement than rice; irrigation depends on species and rainfall.',
        notes: 'Please select the exact millet type for more specific guidance.',
      },
      sorghum: {
        crop: 'Sorghum (jowar)',
        soil: 'Well-drained loam to clay-loam soil.',
        ph: 'Around 5.5–8.0 may be tolerated depending on soil and variety.',
        water: 'Generally drought-tolerant once established; irrigate based on rainfall and growth stage.',
        notes: 'Local variety and season are important.',
      },
      pulses: {
        crop: 'Pulses',
        soil: 'Usually well-drained soil; exact needs depend on the pulse crop.',
        ph: 'Often around 6.0–7.5, depending on the species.',
        water: 'Avoid waterlogging; irrigation needs vary by crop and growth stage.',
        notes: 'Choose a specific pulse such as chickpea, pigeon pea or green gram for better guidance.',
      },
      chickpea: {
        crop: 'Chickpea (gram)',
        soil: 'Well-drained loam or sandy-loam soil.',
        ph: 'Around 6.0–8.0 may be suitable depending on local conditions.',
        water: 'Usually limited irrigation is needed; avoid waterlogging.',
        notes: 'Sowing time and terminal heat affect yield.',
      },
      'green gram': {
        crop: 'Green gram (mung bean)',
        soil: 'Well-drained sandy-loam or loam soil.',
        ph: 'Around 6.0–7.5 is commonly suitable.',
        water: 'Moderate to low water requirement; avoid waterlogging.',
        notes: 'Short duration varieties and local season recommendations matter.',
      },
    };

    if (!name) return null;

    return recommendations[name] || {
      crop: name.charAt(0).toUpperCase() + name.slice(1),
      soil: 'A crop-specific soil recommendation is not available in this version.',
      ph: 'Please confirm the suitable pH for this crop with a local agriculture officer or reliable crop guide.',
      water: 'Water requirements depend on the crop variety, growth stage, soil and local rainfall.',
      notes: 'Try a supported crop name such as rice, wheat, maize, cotton, tomato, potato, sugarcane, groundnut, chilli, soybean, sorghum or chickpea.',
    };
  }

  loading = false;
  errorMessage = '';
  successMessage = '';
  savingCrop = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Show login first.
  }

  // JWT authorization
  private getAuthHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('agricultureToken') || '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // Switch between login and signup
  switchAuthMode(mode: 'login' | 'signup'): void {
    this.authMode = mode;
    this.authError = '';
    this.authSuccess = '';
    this.showPassword = false;

    this.authForm = {
      name: '',
      email: '',
      password: '',
    };
  }

  // Login or create an account
  submitAuth(): void {
    this.authError = '';
    this.authSuccess = '';

    const name = this.authForm.name.trim();
    const email = this.authForm.email.trim().toLowerCase();
    const password = this.authForm.password;

    if (this.authMode === 'signup' && !name) {
      this.authError = 'Please enter your name.';
      return;
    }

    if (!email || !password) {
      this.authError = 'Please enter your email and password.';
      return;
    }

    if (this.authMode === 'signup' && password.length < 8) {
      this.authError = 'Password must contain at least 8 characters.';
      return;
    }

    this.authLoading = true;

    if (this.authMode === 'signup') {
      this.http
        .post<any>(`${this.authApiUrl}/signup`, {
          name,
          email,
          password,
        })
        .subscribe({
          next: (response) => {
            this.authLoading = false;
            this.authSuccess = response.message || 'Account created successfully.';

            this.authMode = 'login';

            this.authForm = {
              name: '',
              email,
              password: '',
            };

            this.cdr.detectChanges();
          },
          error: (error) => {
            this.authLoading = false;
            this.authError = error.error?.message || 'Could not create your account.';

            this.cdr.detectChanges();
          },
        });
    } else {
      this.http
        .post<any>(`${this.authApiUrl}/login`, {
          email,
          password,
        })
        .subscribe({
          next: (response) => {
            this.authLoading = false;

            sessionStorage.setItem('agricultureToken', response.token);

            sessionStorage.setItem('agricultureUser', JSON.stringify(response.user));

            this.currentUser = response.user;
            this.isLoggedIn = true;

            this.authForm = {
              name: '',
              email: '',
              password: '',
            };

            this.loadAgricultureData();
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.authLoading = false;
            this.authError = error.error?.message || 'Login failed. Please try again.';

            this.cdr.detectChanges();
          },
        });
    }
  }

  // Logout
  logout(): void {
    sessionStorage.removeItem('agricultureToken');
    sessionStorage.removeItem('agricultureUser');

    this.isLoggedIn = false;
    this.currentUser = null;
    this.authMode = 'login';

    this.authError = '';
    this.authSuccess = '';
    this.showPassword = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.settingsMessage = '';

    this.crops = [];

    this.authForm = {
      name: '',
      email: '',
      password: '',
    };
  }

  // Load dashboard data, saved settings and crops
  loadAgricultureData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.settingsMessage = '';

    // Load the general agriculture information first.
    this.http.get<any>(this.apiUrl).subscribe({
      next: (data) => {
        this.soil = data.soil ?? this.soil;
        this.weather = data.weather ?? this.weather;
        this.irrigation = data.irrigation ?? this.irrigation;

        // Load this logged-in user's saved settings.
        this.http
          .get<any>(this.settingsApiUrl, {
            headers: this.getAuthHeaders(),
          })
          .subscribe({
            next: (savedSettings) => {
              this.soil = savedSettings.soil ?? this.soil;
              this.weather = savedSettings.weather ?? this.weather;
              this.irrigation = savedSettings.irrigation ?? this.irrigation;

              this.loadSavedCrops();
            },
            error: (error) => {
              console.error('Load settings error:', error);

              if (error.status === 401) {
                this.loading = false;
                this.logout();
                this.authError = 'Your login session has expired. Please log in again.';
                this.cdr.detectChanges();
                return;
              }

              this.settingsMessage =
                error.error?.message ||
                'Could not load saved settings. Check the backend and database.';

              // Still load crops if settings cannot be loaded.
              this.loadSavedCrops();
            },
          });
      },
      error: (error) => {
        console.error('Agriculture API error:', error);

        this.errorMessage = 'Could not connect to the agriculture API.';

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Load saved crops from MySQL
  private loadSavedCrops(): void {
    this.http
      .get<any[]>(this.cropsApiUrl, {
        headers: this.getAuthHeaders(),
      })
      .subscribe({
        next: (savedCrops) => {
          this.crops = savedCrops ?? [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('MySQL crops error:', error);

          if (error.status === 401) {
            this.loading = false;
            this.logout();
            this.authError = 'Your login session has expired. Please log in again.';
          } else {
            this.errorMessage = 'Could not load saved crops from MySQL.';
            this.loading = false;
          }

          this.cdr.detectChanges();
        },
      });
  }

  // Save soil, weather and irrigation settings to MySQL
  saveAgricultureSettings(): void {
    this.settingsMessage = '';

    const token = sessionStorage.getItem('agricultureToken');

    if (!token) {
      this.settingsMessage = 'Please log in again to save settings.';
      return;
    }

    this.settingsSaving = true;

    this.http
      .put<any>(
        this.settingsApiUrl,
        {
          soil: this.soil,
          weather: this.weather,
          irrigation: this.irrigation,
        },
        {
          headers: this.getAuthHeaders(),
        },
      )
      .subscribe({
        next: (response) => {
          this.settingsSaving = false;
          this.settingsMessage = response.message || 'Settings saved successfully.';
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.settingsSaving = false;

          if (error.status === 401) {
            this.logout();
            this.authError = 'Your login session has expired. Please log in again.';
          } else {
            this.settingsMessage =
              error.error?.message || 'Could not save settings. Check the backend and database.';
          }

          this.cdr.detectChanges();
        },
      });
  }

  // Soil selection change
  onSoilTypeChange(value: string): void {
    this.soil = {
      ...this.soil,
      type: value,
    };

    this.settingsMessage = 'Settings changed. Click Save Settings to store them.';
  }

  // Irrigation selection change
  onIrrigationChange(value: string): void {
    this.irrigation = {
      ...this.irrigation,
      status: value,
    };

    this.settingsMessage = 'Settings changed. Click Save Settings to store them.';
  }

  // Weather input change
  onWeatherChange(field: 'temperature' | 'humidity' | 'rainfall', value: number | string): void {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
      return;
    }

    if (field === 'humidity' && (numberValue < 0 || numberValue > 100)) {
      this.settingsMessage = 'Humidity must be between 0 and 100.';
      return;
    }

    if (field === 'rainfall' && numberValue < 0) {
      this.settingsMessage = 'Rainfall cannot be negative.';
      return;
    }

    this.weather = {
      ...this.weather,
      [field]: numberValue,
    };

    this.settingsMessage = 'Settings changed. Click Save Settings to store them.';
  }

  // Refresh data from the APIs and MySQL
  refreshAgricultureSettings(): void {
    this.loadAgricultureData();
  }

  // Register a crop in MySQL
  registerCrop(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (
      !this.cropForm.name.trim() ||
      !this.cropForm.season ||
      !this.cropForm.area ||
      this.cropForm.area <= 0 ||
      !this.cropForm.status
    ) {
      this.errorMessage = 'Please enter valid details for all crop fields.';
      return;
    }

    this.savingCrop = true;

    this.http
      .post<any>(
        this.cropsApiUrl,
        {
          ...this.cropForm,
          name: this.cropForm.name.trim(),
          area: Number(this.cropForm.area),
        },
        {
          headers: this.getAuthHeaders(),
        },
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Crop registered and saved to MySQL successfully!';

          this.cropForm = {
            name: '',
            season: 'Kharif',
            area: 1,
            status: 'Growing',
          };

          this.savingCrop = false;
          this.loadAgricultureData();
        },
        error: (error) => {
          console.error('Register crop error:', error);

          if (error.status === 401) {
            this.logout();
            this.authError = 'Your login session has expired. Please log in again.';
          } else {
            this.errorMessage = error.error?.message || 'Could not save crop to MySQL.';
          }

          this.savingCrop = false;
          this.cdr.detectChanges();
        },
      });
  }
}
