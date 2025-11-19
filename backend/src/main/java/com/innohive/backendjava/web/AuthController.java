package com.innohive.backendjava.web;

import com.innohive.backendjava.model.User;
import com.innohive.backendjava.repository.UserRepository;
import com.innohive.backendjava.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        Map<String, String> errors = new HashMap<>();

        if (isBlank(request.getUsername())) {
            errors.put("username", "username is required");
        }
        if (isBlank(request.getPassword())) {
            errors.put("password", "password is required");
        }
        if (isBlank(request.getFirstName())) {
            errors.put("firstName", "first name is required");
        }
        if (isBlank(request.getLastName())) {
            errors.put("lastName", "last name is required");
        }

        if (!errors.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("errors", errors));
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            errors.put("username", "username is already registered");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("errors", errors));
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        userRepository.save(user);

        String token = jwtService.generateToken(user.getUsername());
        AuthResponse response = new AuthResponse(token, user.getUsername(), user.getFirstName(), user.getLastName());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        if (isBlank(request.getUsername()) || isBlank(request.getPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "username and password required"));
        }

        User user = userRepository.findByUsername(request.getUsername())
                .orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "invalid credentials"));
        }

        String token = jwtService.generateToken(user.getUsername());
        AuthResponse response = new AuthResponse(token, user.getUsername(), user.getFirstName(), user.getLastName());

        return ResponseEntity.ok(response);
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    public static class RegisterRequest {
        @NotBlank
        @Size(max = 50, message = "username must be at most 50 characters long")
        private String username;
        @NotBlank
        @Size(max = 100, message = "password must be at most 100 characters long")
        private String password;
        @NotBlank
        @Size(max = 100, message = "first name must be at most 100 characters long")
        private String firstName;
        @NotBlank
        @Size(max = 100, message = "last name must be at most 100 characters long")
        private String lastName;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }
    }

    public static class LoginRequest {
        @NotBlank
        @Size(max = 50, message = "username must be at most 50 characters long")
        private String username;
        @NotBlank
        @Size(max = 100, message = "password must be at most 100 characters long")
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class AuthResponse {
        private String token;
        private String username;
        private String firstName;
        private String lastName;

        public AuthResponse(String token, String username, String firstName, String lastName) {
            this.token = token;
            this.username = username;
            this.firstName = firstName;
            this.lastName = lastName;
        }

        public String getToken() {
            return token;
        }

        public String getUsername() {
            return username;
        }

        public String getFirstName() {
            return firstName;
        }

        public String getLastName() {
            return lastName;
        }
    }
}
