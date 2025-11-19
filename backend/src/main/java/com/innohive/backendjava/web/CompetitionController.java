package com.innohive.backendjava.web;

import com.innohive.backendjava.model.Competition;
import com.innohive.backendjava.model.Participant;
import com.innohive.backendjava.model.User;
import com.innohive.backendjava.repository.CompetitionRepository;
import com.innohive.backendjava.repository.ParticipantRepository;
import com.innohive.backendjava.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/competitions")
@CrossOrigin
public class CompetitionController {

    private final CompetitionRepository competitionRepository;
    private final ParticipantRepository participantRepository;
    private final UserRepository userRepository;

    public CompetitionController(CompetitionRepository competitionRepository,
                                 ParticipantRepository participantRepository,
                                 UserRepository userRepository) {
        this.competitionRepository = competitionRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> listCompetitions() {
        List<Competition> all = competitionRepository.findAll();

        // Avoid N+1 count queries by doing a single grouped count
        List<Object[]> rawCounts = participantRepository.countByCompetitionIn(all);
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : rawCounts) {
            Long competitionId = (Long) row[0];
            Long cnt = (Long) row[1];
            counts.put(competitionId, cnt);
        }

        List<CompetitionResponse> competitions = all.stream()
                .map(c -> {
                    long count = counts.getOrDefault(c.getId(), 0L);
                    return CompetitionResponse.fromEntity(c, count);
                })
                .collect(Collectors.toList());

        Map<String, Object> body = new HashMap<>();
        body.put("competitions", competitions);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinCompetition(@PathVariable("id") Long id, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Unauthorized"));
        }

        String username = authentication.getName();

        Optional<Competition> competitionOpt = competitionRepository.findById(id);
        if (competitionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "competition not found"));
        }

        Competition competition = competitionOpt.get();

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "user not found"));
        }

        Optional<Participant> existing = participantRepository.findByCompetitionAndUser(competition, user);
        if (existing.isEmpty()) {
            Participant p = new Participant();
            p.setCompetition(competition);
            p.setUser(user);
            p.setJoinedAt(java.time.OffsetDateTime.now());
            p.setRoi(BigDecimal.ZERO);
            participantRepository.save(p);
        }

        long count = participantRepository.countByCompetition(competition);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("participants", count);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}/participants")
    public ResponseEntity<?> listParticipants(@PathVariable("id") Long id) {
        Optional<Competition> competitionOpt = competitionRepository.findById(id);
        if (competitionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "competition not found"));
        }

        Competition competition = competitionOpt.get();
        List<Participant> participants = participantRepository.findByCompetition(competition);

        List<ParticipantView> views = participants.stream()
                .map(p -> new ParticipantView(
                        p.getUser().getUsername(),
                        p.getUser().getFirstName(),
                        p.getUser().getLastName(),
                        p.getRoi(),
                        p.getJoinedAt() != null ? p.getJoinedAt().toString() : null
                ))
                .collect(Collectors.toList());

        Map<String, Object> body = new HashMap<>();
        body.put("id", String.valueOf(competition.getId()));
        body.put("name", competition.getName());
        body.put("participants", views);

        return ResponseEntity.ok(body);
    }

    @GetMapping("/joined")
    public ResponseEntity<?> listJoinedCompetitions(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Unauthorized"));
        }

        String username = authentication.getName();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "user not found"));
        }

        List<Participant> memberships = participantRepository.findByUser(user);
        List<String> ids = memberships.stream()
                .map(p -> String.valueOf(p.getCompetition().getId()))
                .distinct()
                .toList();

        Map<String, Object> body = new HashMap<>();
        body.put("competitionIds", ids);
        return ResponseEntity.ok(body);
    }

    public static class CompetitionResponse {
        private String id;
        private String name;
        private BigDecimal entryFee;
        private BigDecimal prizePool;
        private long participants;
        private String startAt;
        private String endAt;

        public static CompetitionResponse fromEntity(Competition c, long participantCount) {
            CompetitionResponse r = new CompetitionResponse();
            r.id = String.valueOf(c.getId());
            r.name = c.getName();
            r.entryFee = c.getEntryFee();
            r.prizePool = c.getPrizePool();
            r.participants = participantCount;
            LocalDateTime start = c.getStartDate();
            LocalDateTime end = c.getEndDate();
            r.startAt = start != null ? start.toString() : null;
            r.endAt = end != null ? end.toString() : null;
            return r;
        }

        public String getId() {
            return id;
        }

        public String getName() {
            return name;
        }

        public BigDecimal getEntryFee() {
            return entryFee;
        }

        public BigDecimal getPrizePool() {
            return prizePool;
        }

        public long getParticipants() {
            return participants;
        }

        public String getStartAt() {
            return startAt;
        }

        public String getEndAt() {
            return endAt;
        }
    }

    public static class ParticipantView {
        private String username;
        private String firstName;
        private String lastName;
        private BigDecimal roi;
        private String joinedAt;

        public ParticipantView(String username, String firstName, String lastName, BigDecimal roi, String joinedAt) {
            this.username = username;
            this.firstName = firstName;
            this.lastName = lastName;
            this.roi = roi;
            this.joinedAt = joinedAt;
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

        public BigDecimal getRoi() {
            return roi;
        }

        public String getJoinedAt() {
            return joinedAt;
        }
    }
}
