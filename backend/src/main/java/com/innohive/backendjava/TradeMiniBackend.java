package com.innohive.backendjava;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TradeMiniBackend {

    public static void main(String[] args) {
        SpringApplication.run(TradeMiniBackend.class, args);
    }
}
