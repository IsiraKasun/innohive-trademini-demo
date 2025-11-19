package com.innohive.backendjava.scheduler;

import com.innohive.backendjava.model.Competition;
import com.innohive.backendjava.repository.CompetitionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class CompetitionStatusScheduler {

    private final CompetitionRepository competitionRepository;

    public CompetitionStatusScheduler(CompetitionRepository competitionRepository) {
        this.competitionRepository = competitionRepository;
    }

    // Run every 60 seconds to keep status in sync with time
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void refreshStatuses() {
        LocalDateTime now = LocalDateTime.now();

        // now between start and end -> should be active
        List<Competition> toActivate = competitionRepository
                .findByStatusNotAndStartDateBeforeAndEndDateAfter("active", now, now);
        for (Competition c : toActivate) {
            c.setStatus("active");
        }

        // now after end -> should be finished
        List<Competition> toFinish = competitionRepository
                .findByStatusNotAndEndDateBefore("finished", now);
        for (Competition c : toFinish) {
            c.setStatus("finished");
        }

        if (!toActivate.isEmpty()) {
            competitionRepository.saveAll(toActivate);
        }
        if (!toFinish.isEmpty()) {
            competitionRepository.saveAll(toFinish);
        }
    }
}
