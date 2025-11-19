package com.innohive.backendjava.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final Key key;
    private final int expirationDays;

    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.expiration-days:7}") int expirationDays) {
        Key signingKey;
        if (secret != null) {
            byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
            signingKey = Keys.hmacShaKeyFor(keyBytes);
        } else {
            signingKey = Keys.secretKeyFor(SignatureAlgorithm.HS256);
        }

        this.key = signingKey;
        this.expirationDays = expirationDays;
    }

    public String generateToken(String username) {
        Instant now = Instant.now();
        Instant exp = now.plus(expirationDays, ChronoUnit.DAYS);
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(exp))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return getAllClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            getAllClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims getAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
