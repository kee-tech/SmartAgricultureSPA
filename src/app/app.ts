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
  private authApiUrl = 'http://localhost:3000/api/auth';

  // Authentication
  authMode: 'login' | 'signup' = 'login';
  isLoggedIn = false;
  currentUser: any = null;
  authLoading = false;
  authError = '';
  authSuccess = '';

  authForm = {
    name: '',
    email: '',
    password: '',
  };

  // Dashboard data
  crops: any[] = [];
  soil: any = { type: 'Loading...', moisture: 0, ph: 0 };
  weather: any = { temperature: 0, humidity: 0, rainfall: 0 };

  irrigation: any = {
    status: 'Loading...',
    waterUsage: 0,
    unit: 'litres',
  };

  cropForm = {
    name: '',
    season: 'Kharif',
    area: 1,
    status: 'Growing',
  };

  loading = false;
  errorMessage = '';
  successMessage = '';
  savingCrop = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Show login first. Dashboard loads after successful login.
  }

  // Attach the JWT token to protected crop API requests.
  private getAuthHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('agricultureToken') || '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  switchAuthMode(mode: 'login' | 'signup'): void {
    this.authMode = mode;
    this.authError = '';
    this.authSuccess = '';
    this.authForm = {
      name: '',
      email: '',
      password: '',
    };
  }

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

  logout(): void {
    sessionStorage.removeItem('agricultureToken');
    sessionStorage.removeItem('agricultureUser');

    this.isLoggedIn = false;
    this.currentUser = null;
    this.authMode = 'login';

    this.authError = '';
    this.authSuccess = '';
    this.errorMessage = '';
    this.successMessage = '';

    this.authForm = {
      name: '',
      email: '',
      password: '',
    };
  }

  loadAgricultureData(): void {
    this.loading = true;
    this.errorMessage = '';

    // Load general agriculture information.
    this.http.get<any>(this.apiUrl).subscribe({
      next: (data) => {
        this.soil = data.soil ?? this.soil;
        this.weather = data.weather ?? this.weather;
        this.irrigation = data.irrigation ?? this.irrigation;

        // Load saved crops with the JWT authorization header.
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
                this.logout();
                this.authError = 'Your login session has expired. Please log in again.';
              } else {
                this.errorMessage = 'Could not load saved crops from MySQL.';
              }

              this.loading = false;
              this.cdr.detectChanges();
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

    // Save the crop with the JWT authorization header.
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
