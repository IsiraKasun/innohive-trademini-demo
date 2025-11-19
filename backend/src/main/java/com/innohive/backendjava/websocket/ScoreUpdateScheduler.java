package com.innohive.backendjava.websocket;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ScoreUpdateScheduler {

    private final LeaderboardWebSocketHandler handler;

    public ScoreUpdateScheduler(LeaderboardWebSocketHandler handler) {
        this.handler = handler;
    }

    // Roughly match the Node.js interval (every 2 seconds)
    @Scheduled(fixedRate = 2000)
    public void tick() {
        handler.broadcastRandomScoreUpdate();
    }
}
