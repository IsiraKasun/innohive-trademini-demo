package com.innohive.backendjava.repository;

import com.innohive.backendjava.model.Competition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface CompetitionRepository extends JpaRepository<Competition, Long> {
    List<Competition> findByStatus(String status);

    // Competitions that have started but not yet ended and are not currently marked active
    List<Competition> findByStatusNotAndStartDateBeforeAndEndDateAfter(
            String status, LocalDateTime startBefore, LocalDateTime endAfter);

    // Competitions that have already ended but are not currently marked finished
    List<Competition> findByStatusNotAndEndDateBefore(String status, LocalDateTime endBefore);
}
