package com.innohive.backendjava.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final LeaderboardWebSocketHandler leaderboardWebSocketHandler;

    public WebSocketConfig(LeaderboardWebSocketHandler leaderboardWebSocketHandler) {
        this.leaderboardWebSocketHandler = leaderboardWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry
                .addHandler(leaderboardWebSocketHandler, "/ws")
                .setAllowedOriginPatterns("*");
    }
}
