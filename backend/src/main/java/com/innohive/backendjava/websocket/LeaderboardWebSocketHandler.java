package com.innohive.backendjava.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innohive.backendjava.model.Competition;
import com.innohive.backendjava.model.Participant;
import com.innohive.backendjava.repository.CompetitionRepository;
import com.innohive.backendjava.repository.ParticipantRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class LeaderboardWebSocketHandler extends TextWebSocketHandler {

    private final CompetitionRepository competitionRepository;
    private final ParticipantRepository participantRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    private final Random random = new Random();

    public LeaderboardWebSocketHandler(CompetitionRepository competitionRepository,
                                       ParticipantRepository participantRepository) {
        this.competitionRepository = competitionRepository;
        this.participantRepository = participantRepository;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
        // send initial snapshot for all competitions
        sendSnapshotsToSession(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        sessions.remove(session);
    }

    private void sendSnapshotsToSession(WebSocketSession session) {
        List<Competition> competitions = competitionRepository.findAll();
        for (Competition c : competitions) {
            List<Participant> participants = participantRepository.findByCompetition(c);
            List<Map<String, Object>> traders = new ArrayList<>();
            for (Participant p : participants) {
                Map<String, Object> t = new HashMap<>();
                t.put("name", p.getUser().getUsername());
                BigDecimal roi = p.getRoi() != null ? p.getRoi() : BigDecimal.ZERO;
                t.put("score", roi.doubleValue());
                traders.add(t);
            }
            traders.sort((a, b) -> Double.compare((double) b.get("score"), (double) a.get("score")));

            Map<String, Object> frame = new HashMap<>();
            frame.put("type", "snapshot");
            frame.put("competitionId", String.valueOf(c.getId()));
            frame.put("traders", traders);

            sendJson(session, frame);
        }
    }

    public void broadcastRandomScoreUpdate() {
        if (sessions.isEmpty()) {
            return;
        }

        // Only push updates for competitions in active state
        List<Competition> competitions = competitionRepository.findByStatus("active");
        if (competitions.isEmpty()) return;

        Competition c = competitions.get(random.nextInt(competitions.size()));
        List<Participant> participants = participantRepository.findByCompetition(c);
        if (participants.isEmpty()) return;

        int updatesCount = Math.max(1, participants.size() / 4);
        Collections.shuffle(participants, random);
        List<Participant> toUpdate = participants.subList(0, updatesCount);

        List<Map<String, Object>> updates = new ArrayList<>();
        for (Participant p : toUpdate) {
            BigDecimal current = p.getRoi() != null ? p.getRoi() : BigDecimal.ZERO;
            // random delta between -5 and +5
            double delta = (random.nextDouble() * 10.0) - 5.0;
            BigDecimal next = current.add(BigDecimal.valueOf(delta));
            p.setRoi(next);
            updates.add(Map.of(
                    "name", p.getUser().getUsername(),
                    "score", next.doubleValue()
            ));
        }
        participantRepository.saveAll(toUpdate);

        Map<String, Object> frame = new HashMap<>();
        frame.put("type", "score_update");
        frame.put("competitionId", String.valueOf(c.getId()));
        frame.put("updates", updates);

        broadcastJson(frame);
    }

    private void sendJson(WebSocketSession session, Map<String, Object> payload) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
            }
        } catch (IOException ignored) {
        }
    }

    private void broadcastJson(Map<String, Object> payload) {
        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (IOException e) {
            return;
        }
        TextMessage msg = new TextMessage(json);
        for (WebSocketSession s : sessions) {
            try {
                if (s.isOpen()) {
                    s.sendMessage(msg);
                }
            } catch (IOException ignored) {
            }
        }
    }
}
